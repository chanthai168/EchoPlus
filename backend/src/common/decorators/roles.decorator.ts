
import { Reflector } from '@nestjs/core';

// create a type decorator that accept an array of string 
export const Roles = Reflector.createDecorator<string[]>();