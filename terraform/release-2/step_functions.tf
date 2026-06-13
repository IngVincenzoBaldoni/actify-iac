# ─── CloudWatch Log Group for Step Functions ─────────────────────────────────
resource "aws_cloudwatch_log_group" "sfn_doc_pipeline" {
  name              = "/aws/states/${local.sfn_doc_generation_name}"
  retention_in_days = 30
  tags              = local.common_tags
}

# ─── Step Functions Standard Workflow — DocGenerationWorkflow ─────────────────
# Flow:
#   AssembleContext → GenerateSlots (Map, MaxConcurrency=3) →
#   ValidationGate1 → CheckValidation1
#     ├─ passed → AssembleDocument → RenderPdf → PersistAndAudit → Done
#     └─ failed → RetryWithFeedback → ValidationGate2 → CheckValidation2
#                   ├─ passed → AssembleDocument
#                   └─ failed → MarkReviewRequired → ReviewRequiredDone
#   Any error → MarkFailed → Fail
resource "aws_sfn_state_machine" "doc_generation" {
  name     = local.sfn_doc_generation_name
  role_arn = aws_iam_role.sfn_doc_pipeline.arn
  type     = "STANDARD"

  definition = jsonencode({
    Comment = "Actify Document Generation Pipeline — SDD v1.1"
    StartAt = "AssembleContext"
    States = {

      # ── Step 1: Load schema, company, system, gap + article texts ────────────
      AssembleContext = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.doc_assemble_ctx.arn
          "Payload.$"  = "$"
        }
        ResultSelector = {
          "schema.$"          = "$.Payload.schema"
          "company.$"         = "$.Payload.company"
          "system.$"          = "$.Payload.system"
          "gap.$"             = "$.Payload.gap"
          "articleTexts.$"    = "$.Payload.articleTexts"
          "allowedRefs.$"     = "$.Payload.allowedRefs"
          "generativeSlots.$" = "$.Payload.generativeSlots"
          "fixedSections.$"   = "$.Payload.fixedSections"
          "contextS3Key.$"    = "$.Payload.contextS3Key"
          "kbVersion.$"       = "$.Payload.kbVersion"
          "modelId.$"         = "$.Payload.modelId"
          "promptVersion.$"   = "$.Payload.promptVersion"
        }
        ResultPath = "$.context"
        Next       = "GenerateSlots"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "MarkFailed"
        }]
      }

      # ── Step 2: Map — generate each GENERATIVE slot concurrently ─────────────
      GenerateSlots = {
        Type      = "Map"
        ItemsPath = "$.context.generativeSlots"
        ItemSelector = {
          "slot.$"          = "$$.Map.Item.Value"
          "context.$"       = "$.context"
          "generationId.$"  = "$.generationId"
        }
        MaxConcurrency = 3
        Iterator = {
          StartAt = "GenerateOneSlot"
          States = {
            GenerateOneSlot = {
              Type     = "Task"
              Resource = "arn:aws:states:::lambda:invoke"
              Parameters = {
                FunctionName = aws_lambda_function.doc_generate_slot.arn
                "Payload.$"  = "$"
              }
              ResultSelector = {
                "slotId.$"  = "$.Payload.slotId"
                "content.$" = "$.Payload.content"
              }
              End = true
            }
          }
        }
        ResultPath = "$.slots"
        Next       = "ValidationGate1"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "MarkFailed"
        }]
      }

      # ── Step 3: First validation pass ────────────────────────────────────────
      ValidationGate1 = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.doc_validate.arn
          Payload = {
            "slots.$"         = "$.slots"
            "context.$"       = "$.context"
            "generationId.$"  = "$.generationId"
          }
        }
        ResultSelector = {
          "passed.$"      = "$.Payload.passed"
          "failedSlots.$" = "$.Payload.failedSlots"
          "report.$"      = "$.Payload.report"
        }
        ResultPath = "$.validation"
        Next       = "CheckValidation1"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "MarkFailed"
        }]
      }

      CheckValidation1 = {
        Type = "Choice"
        Choices = [{
          Variable      = "$.validation.passed"
          BooleanEquals = true
          Next          = "AssembleDocument"
        }]
        Default = "RetryWithFeedback"
      }

      # ── Step 4: Retry failed slots with feedback injected ────────────────────
      RetryWithFeedback = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.doc_generate_slot.arn
          Payload = {
            retryMode           = true
            "failedSlots.$"     = "$.validation.failedSlots"
            "slots.$"           = "$.slots"
            "context.$"         = "$.context"
            "validationReport.$" = "$.validation.report"
            "generationId.$"    = "$.generationId"
          }
        }
        ResultSelector = {
          "slots.$" = "$.Payload.slots"
        }
        ResultPath = "$.retryResult"
        Next       = "UpdateSlotsAfterRetry"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "MarkFailed"
        }]
      }

      UpdateSlotsAfterRetry = {
        Type = "Pass"
        Parameters = {
          "generationId.$" = "$.generationId"
          "companyId.$"    = "$.companyId"
          "systemId.$"     = "$.systemId"
          "gapId.$"        = "$.gapId"
          "docType.$"      = "$.docType"
          attempt          = 1
          "context.$"      = "$.context"
          "slots.$"        = "$.retryResult.slots"
          "validation.$"   = "$.validation"
        }
        Next = "ValidationGate2"
      }

      # ── Step 4b: Second validation pass (after retry) ────────────────────────
      ValidationGate2 = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.doc_validate.arn
          Payload = {
            "slots.$"        = "$.slots"
            "context.$"      = "$.context"
            "generationId.$" = "$.generationId"
          }
        }
        ResultSelector = {
          "passed.$"      = "$.Payload.passed"
          "failedSlots.$" = "$.Payload.failedSlots"
          "report.$"      = "$.Payload.report"
        }
        ResultPath = "$.validation"
        Next       = "CheckValidation2"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "MarkFailed"
        }]
      }

      CheckValidation2 = {
        Type = "Choice"
        Choices = [{
          Variable      = "$.validation.passed"
          BooleanEquals = true
          Next          = "AssembleDocument"
        }]
        Default = "MarkReviewRequired"
      }

      # ── Step 5: Merge template + slots → canonical Markdown → S3 ─────────────
      AssembleDocument = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.doc_assemble.arn
          Payload = {
            "slots.$"        = "$.slots"
            "context.$"      = "$.context"
            "generationId.$" = "$.generationId"
            "companyId.$"    = "$.companyId"
            "systemId.$"     = "$.systemId"
            "docType.$"      = "$.docType"
          }
        }
        ResultSelector = {
          "markdownS3Key.$"   = "$.Payload.markdownS3Key"
          "markdownContent.$" = "$.Payload.markdownContent"
          "title.$"           = "$.Payload.title"
        }
        ResultPath = "$.assembled"
        Next       = "RenderPdf"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "MarkFailed"
        }]
      }

      # ── Step 6: Markdown → PDF with provenance frontespizio ──────────────────
      # Invokes existing lambda-pdf with _docPipelineRenderRequest event type.
      # lambda-pdf saves PDF directly to S3 and returns { pdfS3Key }.
      RenderPdf = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = "arn:aws:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:${local.lambda_pdf_name}"
          Payload = {
            _docPipelineRenderRequest = {
              "markdownContent.$" = "$.assembled.markdownContent"
              "title.$"           = "$.assembled.title"
              "generationId.$"    = "$.generationId"
              "companyId.$"       = "$.companyId"
              "systemId.$"        = "$.systemId"
              "docType.$"         = "$.docType"
              "schemaVersion.$"   = "$.context.schema.version"
              "kbVersion.$"       = "$.context.kbVersion"
              "modelId.$"         = "$.context.modelId"
              "promptVersion.$"   = "$.context.promptVersion"
              isDraft             = true
            }
          }
        }
        ResultSelector = {
          "pdfS3Key.$" = "$.Payload.pdfS3Key"
        }
        ResultPath = "$.pdf"
        Next       = "PersistAndAudit"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "MarkFailed"
        }]
      }

      # ── Step 7: Persist document record + audit trail event ──────────────────
      PersistAndAudit = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.doc_persist.arn
          Payload = {
            action           = "persist_draft"
            "generationId.$" = "$.generationId"
            "companyId.$"    = "$.companyId"
            "systemId.$"     = "$.systemId"
            "gapId.$"        = "$.gapId"
            "docType.$"      = "$.docType"
            "context.$"      = "$.context"
            "assembled.$"    = "$.assembled"
            "pdf.$"          = "$.pdf"
            "validation.$"   = "$.validation"
          }
        }
        ResultSelector = {
          "documentId.$" = "$.Payload.documentId"
        }
        ResultPath = "$.result"
        Next       = "Done"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          ResultPath  = "$.error"
          Next        = "MarkFailed"
        }]
      }

      Done = { Type = "Succeed" }

      # ── Error terminal states ─────────────────────────────────────────────────
      MarkFailed = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.doc_persist.arn
          Payload = {
            action           = "update_status"
            status           = "FAILED"
            "generationId.$" = "$.generationId"
            "companyId.$"    = "$.companyId"
            "error.$"        = "$.error"
          }
        }
        ResultPath = null
        Next       = "Fail"
        Retry = [{
          ErrorEquals  = ["States.ALL"]
          MaxAttempts  = 1
          IntervalSeconds = 2
        }]
      }

      Fail = {
        Type  = "Fail"
        Error = "DocumentGenerationFailed"
        Cause = "Pipeline failed — check doc_generations record for details"
      }

      MarkReviewRequired = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.doc_persist.arn
          Payload = {
            action           = "review_required"
            "generationId.$" = "$.generationId"
            "companyId.$"    = "$.companyId"
            "systemId.$"     = "$.systemId"
            "gapId.$"        = "$.gapId"
            "docType.$"      = "$.docType"
            "context.$"      = "$.context"
            "slots.$"        = "$.slots"
            "validation.$"   = "$.validation"
          }
        }
        ResultPath = null
        Next       = "ReviewRequiredDone"
      }

      ReviewRequiredDone = { Type = "Succeed" }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.sfn_doc_pipeline.arn}:*"
    include_execution_data = true
    level                  = "ERROR"
  }

  tracing_configuration {
    enabled = true
  }

  depends_on = [aws_iam_role_policy_attachment.sfn_doc_pipeline]

  tags = merge(local.common_tags, {
    Name = local.sfn_doc_generation_name
  })
}
