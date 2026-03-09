import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IssueTokenUseCase } from '../../application/auth/issue-token.use-case';
import { Public } from '../../infrastructure/auth/public.decorator';

class TokenRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;
}

@ApiTags('auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly issueToken: IssueTokenUseCase) {}

  @Public()
  @Post('token')
  @HttpCode(200)
  @ApiOperation({ summary: 'Issue demo JWT (local profile only)' })
  token(@Body() body: TokenRequestDto): { accessToken: string } {
    return this.issueToken.execute(body.username, body.password);
  }
}
