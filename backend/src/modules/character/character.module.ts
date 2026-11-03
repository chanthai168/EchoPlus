import { Global, Module } from '@nestjs/common';
import { CharacterController } from './character.controller.js';
import { CharacterService } from './character.service.js';

@Global()
@Module({
    providers:[CharacterService],
    controllers:[CharacterController],
    exports:[CharacterService]
})
export class CharacterModule {
}
