import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { HarvestsService } from './harvests.service';

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Controller('harvests')
@UseGuards(JwtAuthGuard)
export class HarvestsController {
  constructor(private readonly harvests: HarvestsService) {}

  @Post()
  create(
    @Body() input: CreateHarvestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.harvests.create(input, request.user);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.harvests.findAll(request.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.harvests.findOne(id, request.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateHarvestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.harvests.update(id, input, request.user);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.harvests.remove(id, request.user);
    return { message: 'Harvest record deleted successfully.' };
  }
}
