import {BusinessException} from './business.exception.js'
import { HttpStatus } from '@nestjs/common'

export class InsufficientBalanceException extends BusinessException {
    constructor(balance:number){
        super('Insufficient balance to complete this transaction.',
            'INSUFFICIENT_BALANCE', 
            HttpStatus.BAD_REQUEST
        )
    }
}