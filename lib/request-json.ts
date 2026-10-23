import {boundedJSON} from './http-json';
import {PublicError} from './errors';
export async function requestJSON(request:Request,maxBytes=32768):Promise<any>{try{return await boundedJSON(request,maxBytes);}catch{throw new PublicError('The request could not be read or was too large. Shorten your entries and try again.');}}
