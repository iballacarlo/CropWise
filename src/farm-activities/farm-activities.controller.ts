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
import { CreateFarmActivityDto } from './dto/create-farm-activity.dto';
import { UpdateFarmActivityDto } from './dto/update-farm-activity.dto';
import { FarmActivitiesService } from './farm-activities.service';

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Controller('farm-activities')
@UseGuards(JwtAuthGuard)
export class FarmActivitiesController {
  constructor(private readonly activities: FarmActivitiesService) {}

  @Post()
  create(
    @Body() input: CreateFarmActivityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.activities.create(input, request.user);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.activities.findAll(request.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.activities.findOne(id, request.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateFarmActivityDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.activities.update(id, input, request.user);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.activities.remove(id, request.user);
    return { message: 'Farm activity deleted successfully.' };
  }
}
