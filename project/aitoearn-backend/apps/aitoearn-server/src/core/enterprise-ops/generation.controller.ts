import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aitoearn-auth'
import { ApiDoc, ParseObjectIdPipe } from '@yikart/common'
import { EnterprisePaginationDto } from './enterprise.dto'
import { CreateEnterpriseGenerationDto, EnterpriseGenerationVo, ReconcileEnterpriseUsageDto } from './generation.dto'
import { EnterpriseGenerationService } from './generation.service'

@ApiTags('Enterprise/Generation')
@Controller('/enterprise-ops/enterprises/:enterpriseId')
export class EnterpriseGenerationController {
  constructor(private readonly service: EnterpriseGenerationService) {}
  @ApiDoc({ summary: '基于批准知识生成图文编排', body: CreateEnterpriseGenerationDto.schema, response: EnterpriseGenerationVo })
  @Post('/generations')
  async create(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: CreateEnterpriseGenerationDto) {
    const item = await this.service.create(token.id, enterpriseId, dto)
    return EnterpriseGenerationVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '查询企业生成结果', response: EnterpriseGenerationVo })
  @Get('/generations/:id')
  async get(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string) {
    const item = await this.service.get(token.id, enterpriseId, id)
    return EnterpriseGenerationVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '管理员按供应商凭证核对费用', body: ReconcileEnterpriseUsageDto.schema, response: EnterpriseGenerationVo })
  @Post('/usage/:id/reconcile')
  async reconcile(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReconcileEnterpriseUsageDto) {
    const item = await this.service.reconcile(token.id, enterpriseId, id, dto)
    return EnterpriseGenerationVo.create({ ...item, id: String(item._id) })
  }

  @ApiDoc({ summary: '企业生成尝试与用量台账', query: EnterprisePaginationDto.schema, response: [EnterpriseGenerationVo] })
  @Get('/usage')
  async usage(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Query() dto: EnterprisePaginationDto) {
    return (await this.service.list(token.id, enterpriseId, dto.page, dto.pageSize)).map(item => EnterpriseGenerationVo.create({ ...item, id: String(item._id) }))
  }
}
