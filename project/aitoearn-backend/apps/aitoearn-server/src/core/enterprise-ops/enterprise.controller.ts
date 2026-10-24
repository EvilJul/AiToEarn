import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { GetToken, TokenInfo } from '@yikart/aitoearn-auth'
import { ApiDoc, ParseObjectIdPipe } from '@yikart/common'
import { CreateEnterpriseDto, CreateMembershipDto, EnterprisePaginationDto, UpdateEnterpriseDto, UpdateMembershipDto } from './enterprise.dto'
import { EnterpriseService } from './enterprise.service'
import { EnterpriseAuditVo, EnterpriseMembershipVo, EnterpriseVo } from './enterprise.vo'

@ApiTags('Enterprise/Administration')
@Controller('/enterprise-ops/enterprises')
export class EnterpriseController {
  constructor(private readonly service: EnterpriseService) {}

  @ApiDoc({ summary: '授权企业列表', response: [EnterpriseVo] })
  @Get()
  async list(@GetToken() token: TokenInfo) {
    return (await this.service.list(token.id)).map(e => EnterpriseVo.create(e))
  }

  @ApiDoc({ summary: '创建企业', body: CreateEnterpriseDto.schema, response: EnterpriseVo })
  @Post()
  async create(@GetToken() token: TokenInfo, @Body() dto: CreateEnterpriseDto) {
    return EnterpriseVo.create(await this.service.create(token.id, dto))
  }

  @ApiDoc({ summary: '修改企业设置', body: UpdateEnterpriseDto.schema, response: EnterpriseVo })
  @Patch('/:enterpriseId/settings')
  async update(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: UpdateEnterpriseDto) {
    return EnterpriseVo.create(await this.service.update(token.id, enterpriseId, dto))
  }

  @ApiDoc({ summary: '企业成员', response: [EnterpriseMembershipVo] })
  @Get('/:enterpriseId/members')
  async members(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string) {
    return (await this.service.listMembers(token.id, enterpriseId)).map(m => EnterpriseMembershipVo.create(m))
  }

  @ApiDoc({ summary: '添加已有用户为企业成员', body: CreateMembershipDto.schema, response: EnterpriseMembershipVo })
  @Post('/:enterpriseId/members')
  async addMember(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Body() dto: CreateMembershipDto) {
    return EnterpriseMembershipVo.create(await this.service.addMember(token.id, enterpriseId, dto))
  }

  @ApiDoc({ summary: '修改企业成员角色或状态', body: UpdateMembershipDto.schema, response: EnterpriseMembershipVo })
  @Patch('/:enterpriseId/members/:id')
  async updateMember(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateMembershipDto) {
    return EnterpriseMembershipVo.create(await this.service.updateMember(token.id, enterpriseId, id, dto))
  }

  @ApiDoc({ summary: '企业审计事件', query: EnterprisePaginationDto.schema, response: [EnterpriseAuditVo] })
  @Get('/:enterpriseId/audit')
  async audit(@GetToken() token: TokenInfo, @Param('enterpriseId', ParseObjectIdPipe) enterpriseId: string, @Query() query: EnterprisePaginationDto) {
    return (await this.service.listAudits(token.id, enterpriseId, query)).map(e => EnterpriseAuditVo.create(e))
  }
}
