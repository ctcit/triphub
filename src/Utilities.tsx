import { IParticipant } from './Interfaces';

export const DayOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const MonthOfYear = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function GetDateString(date: Date):string {
    return `${date.getFullYear()}-${(date.getMonth()+101).toString().substr(1,2)}-${(date.getDate()+100).toString().substr(1,2)}`
}

export function AddDays(date:Date, days:number):Date {
    return new Date(date.getFullYear(),date.getMonth(),date.getDate()+days)
}

export function GetDate(dateString : string) : string{
    const date = new Date(dateString)
    return DayOfWeek[date.getDay()] + ' ' + date.getDate() + ' ' + MonthOfYear[date.getMonth()]
}

export function GetFullDate(dateString : string) : string{
    const date = new Date(dateString)
    return DayOfWeek[date.getDay()] + ' ' + date.getDate() + ' ' + MonthOfYear[date.getMonth()] + ' ' + date.getFullYear()
}

export function GetLength(length : number) : string{
    return length === 1 ? 'Day' : length === 2 ? 'Weekend' : length + ' days'
}

export function GetDisplayPriority(participant: IParticipant) : number {
    return participant.display_priority || participant.id
}
