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
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { CropsService } from './crops.service';

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Controller('crops')
@UseGuards(JwtAuthGuard)
export class CropsController {
  constructor(private readonly crops: CropsService) {}

  @Post()
  create(@Body() input: CreateCropDto, @Req() request: AuthenticatedRequest) {
    return this.crops.create(input, request.user);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.crops.findAll(request.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crops.findOne(id, request.user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateCropDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.crops.update(id, input, request.user);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    await this.crops.remove(id, request.user);
    return { message: 'Crop deleted successfully.' };
  }
}
