import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { isApiError } from './api-client'

function getApiMessage(value: unknown) {
  if (!value || typeof value !== 'object' || !('message' in value)) return null

  const message = value.message
  return typeof message === 'string' && message.trim() ? message : null
}

export function handleServerError(error: unknown) {
  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'No content.'
  }

  if (isApiError(error)) {
    errMsg = error.message
  } else if (isAxiosError(error)) {
    errMsg = getApiMessage(error.response?.data) ?? errMsg
  }

  toast.error(errMsg)
}
