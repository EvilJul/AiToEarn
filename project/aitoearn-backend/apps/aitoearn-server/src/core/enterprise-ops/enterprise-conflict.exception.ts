import { AppException, ResponseCode } from '@yikart/common'

/** 保留统一业务错误结构，同时向客户端明确返回并发冲突。 */
export class EnterpriseConflictException extends AppException {
  constructor() {
    super(ResponseCode.EnterpriseVersionConflict)
  }

  override getStatus() {
    return 409
  }
}
