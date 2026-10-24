import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aitoearn-auth'
import { ApiDoc, ParseObjectIdPipe } from '@yikart/common'
import { ClaimEnterpriseJobDto, EnterpriseExecutorEventDto, EnterpriseLeaseDto, RegisterEnterpriseExecutorDto } from './executors.dto'
import { EnterpriseExecutorsService } from './executors.service'
import { EnterpriseExecutorClaimVo, EnterpriseExecutorIdVo, EnterpriseExecutorResultVo, EnterpriseExecutorVo, EnterpriseLeaseExpiryVo, EnterpriseSubmitAuthorizationVo } from './executors.vo'

@ApiTags('Enterprise/Executors')
@Controller('/enterprise-ops/enterprises/:enterpriseId')
export class EnterpriseExecutorsController {
  constructor(private readonly service: EnterpriseExecutorsService) {}

  @ApiDoc({ summary: '企业执行设备', response: [EnterpriseExecutorVo] })
  @Get('/executors')
  async list(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string) {
    return (await this.service.list(token.id, enterpriseId)).map(executor => EnterpriseExecutorVo.create(executor))
  }

  @ApiDoc({ summary: '注册当前账号执行设备', body: RegisterEnterpriseExecutorDto.schema, response: EnterpriseExecutorIdVo })
  @Post('/executors/register')
  async register(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: RegisterEnterpriseExecutorDto) {
    return EnterpriseExecutorIdVo.create(await this.service.register(token.id, enterpriseId, dto))
  }

  @ApiDoc({ summary: '执行设备 heartbeat', response: EnterpriseExecutorIdVo })
  @Post('/executors/:id/heartbeat')
  async heartbeat(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return EnterpriseExecutorIdVo.create(await this.service.heartbeat(token.id, enterpriseId, id))
  }

  @ApiDoc({ summary: '执行设备 revoke', response: EnterpriseExecutorIdVo })
  @Post('/executors/:id/revoke')
  async revoke(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    return EnterpriseExecutorIdVo.create(await this.service.revoke(token.id, enterpriseId, id))
  }

  @ApiDoc({ summary: '任务执行 claim', body: ClaimEnterpriseJobDto.schema, response: EnterpriseExecutorClaimVo })
  @Post('/publish-jobs/:id/claim')
  async claim(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ClaimEnterpriseJobDto) {
    return EnterpriseExecutorClaimVo.create(await this.service.claim(token.id, enterpriseId, id, dto))
  }

  @ApiDoc({ summary: '任务执行 renew-lease', body: EnterpriseLeaseDto.schema, response: EnterpriseLeaseExpiryVo })
  @Post('/publish-jobs/:id/renew-lease')
  async renew(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: EnterpriseLeaseDto) {
    return EnterpriseLeaseExpiryVo.create(await this.service.renew(token.id, enterpriseId, id, dto))
  }

  @ApiDoc({ summary: '任务执行 authorize-submit', body: EnterpriseLeaseDto.schema, response: EnterpriseSubmitAuthorizationVo })
  @Post('/publish-jobs/:id/authorize-submit')
  async authorizeSubmit(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: EnterpriseLeaseDto) {
    return EnterpriseSubmitAuthorizationVo.create(await this.service.authorizeSubmit(token.id, enterpriseId, id, dto))
  }

  @ApiDoc({ summary: '任务执行 events', body: EnterpriseExecutorEventDto.schema, response: EnterpriseExecutorResultVo })
  @Post('/publish-jobs/:id/events')
  async event(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: EnterpriseExecutorEventDto) {
    return EnterpriseExecutorResultVo.create(await this.service.event(token.id, enterpriseId, id, dto))
  }
}
