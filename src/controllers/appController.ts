import { Request, Response } from 'express';
import { BrewitService } from '../services/BrewitService.js';
import { BaseSuccessResponseDto, BaseErrorResponseDto } from '../types/agent.js';

/**
 * App Controller
 * Handles both calculator tools (public, no auth) and GitHub tools (authenticated)
 * Demonstrates mixed authentication patterns for educational purposes
 */
export class AppController {
  private brewitService: BrewitService;

  constructor() {
    this.brewitService = new BrewitService();
  }

  /**
   * Handle tool execution - routes to appropriate handler based on tool type
   */
  async handleTool(req: Request, res: Response): Promise<void> {
    const { toolName } = req.params;
    const params = req.body;

    try {
      // Handle Brewit Tools
      if (this.isBrewitTool(toolName)) {
        await this.handleBrewitTool(toolName, params, req, res);
        return;
      }



      // Unknown tool
      const errorResponse = new BaseErrorResponseDto(
        `Unknown tool: ${toolName}`,
        404,
        `Available tools: ${this.getBrewitTools().join(', ')}`
      );
      res.status(404).json(errorResponse);
    } catch (error) {
      const errorResponse = new BaseErrorResponseDto(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500,
        'Tool execution failed'
      );
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Handle brewit tool execution
   */
  private async handleBrewitTool(toolName: string, params: any, req: Request, res: Response): Promise<void> {
    let result;
    const headers = this.extractHeaders(req);

    switch (toolName) {
      case 'send': {
        const sendPayload = {
          toAddress: params.toAddress,
          amount: params.amount,
          token: params.token
        };
        result = await this.brewitService.send({
          ...sendPayload,
          accountAddress: headers.accountAddress,
          validatorSalt: headers.validatorSalt
        });
        break;
      }
      
      case 'swap': {
        const swapPayload = {
          toToken: params.toToken,
          fromToken: params.fromToken,
          amount: params.amount
        };
        result = await this.brewitService.swap({
          ...swapPayload,
          accountAddress: headers.accountAddress,
          validatorSalt: headers.validatorSalt
        });
        break;
      }
      
      default:
        throw new Error(`Unknown brewit tool: ${toolName}`);
    }

    const response = new BaseSuccessResponseDto({
      result,
      message: `Successfully executed ${toolName} operation`,
      tool_type: 'brewit'
    }, 'mixed');

    res.json(response);
  }

  /**
   * Validate required parameters
   */
  private validateSwapParameters(params: any): void {
    const required = ['toToken', 'fromToken', 'validatorSalt', 'amount', 'accountAddress'];
    for (const param of required) {
      if (params[param] === undefined || params[param] === null) {
        throw new Error(`Missing required parameter: ${param}`);
      }
      if (typeof params[param] !== 'string') {
        throw new Error(`Parameter '${param}' must be a string`);
      }
    }
  }

  /**
   * Validate parameters for character count tool
   */
  private validateCharacterCountParameters(params: any): void {
    if (params.character === undefined || params.character === null) {
      throw new Error('Missing required parameter: character');
    }
    if (params.text === undefined || params.text === null) {
      throw new Error('Missing required parameter: text');
    }
    if (typeof params.character !== 'string') {
      throw new Error("Parameter 'character' must be a string");
    }
    if (typeof params.text !== 'string') {
      throw new Error("Parameter 'text' must be a string");
    }
    if (params.character.length !== 1) {
      throw new Error('Character parameter must be exactly one character');
    }
  }



    /**
   * Extract Validator Salt and Account Address from request headers
   */
    private extractHeaders(req: Request): { validatorSalt: string; accountAddress: string } {
      const validatorSalt = req.headers['x-validator-salt'];
      const accountAddress = req.headers['x-account-address'];

      if (!validatorSalt || typeof validatorSalt !== 'string') {
        throw new Error('Missing or invalid x-validator-salt header');
      }
      if (!accountAddress || typeof accountAddress !== 'string') {
        throw new Error('Missing or invalid x-account-address header');
      }

      return { validatorSalt, accountAddress };
    }

  /**
   * Check if tool is a brewit tool
   */
  private isBrewitTool(toolName: string): boolean {
    return this.getBrewitTools().includes(toolName);
  }

  /**
   * Get list of brewit tools
   */
  private getBrewitTools(): string[] {
    return ['send', 'swap'];
  }
} 