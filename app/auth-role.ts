import {isHost} from '../lib/admin';
import type {ChatGPTUser} from './chatgpt-auth';
export async function getWorkspaceRole(user:ChatGPTUser){return isHost(user)?'host':'student';}
