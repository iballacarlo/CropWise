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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/entities/user-role.enum';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto';
import { UpdateInventoryTransactionDto } from './dto/update-inventory-transaction.dto';
import { InventoryTransactionsService } from './inventory-transactions.service';

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

@Controller('inventory-transactions')
@UseGuards(JwtAuthGuard)
export class InventoryTransactionsController {
  constructor(private readonly transactions: InventoryTransactionsService) {}

  @Post()
  create(
    @Body() input: CreateInventoryTransactionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.transactions.create(input, request.user);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.transactions.findAll(request.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.transactions.findOne(id, request.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateInventoryTransactionDto,
  ) {
    return this.transactions.update(id, input);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.transactions.remove(id);
    return { message: 'Inventory transaction deleted successfully.' };
  }
}
