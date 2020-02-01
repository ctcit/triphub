export enum TripState { MyTrip, OpenTrip, ClosedTrip, SuggestedTrip, DeletedTrip }

export interface IValidation {
    id : string
    ok : boolean
    message : string
}

export interface ITrip {
    id : number
    href? : string
    title : string
    role? : string
    openDate : string
    closeDate : string
    tripDate : string
    cost : string
    departurePoint : string
    departureDetails : string
    description : string
    grade : string
    isSocial : boolean
    isNoSignup : boolean
    length : number
    logisticInfo : string
    map1 : string
    map2 : string
    map3 : string
    mapRoute : string
    mapHtml : string
    isDeleted : boolean
    isApproved : boolean
    maxParticipants : number
    leaders? : string
    tripState : TripState
    isOpen : boolean
    editsHref? : string
}

export interface IParticipant {
    id : number
    href? : string
    memberId : number
    name : string
    email : string
    phone : string
    emergencyContactName : string
    emergencyContactPhone : string
    isLeader : boolean
    isPlbProvider : boolean
    isVehicleProvider : boolean
    isDeleted : boolean
    logisticInfo : string
    vehicleRego : string
    displayPriority? : number
}

export interface IMember {
    id : number 
    name : string
    email : string
    phone : string
    emergencyContactName : string
    emergencyContactPhone : string
    role : string
    otherRole : string
    isMe : boolean
    isMember : boolean
    href : string
}

export interface IConfig {
    editRefreshInSec : number
    printLines : number
    calendarStartOfWeek : number
}

export interface IMap {
    coords : any
    sheetCode : string
    name : string
}

export interface IHoliday {
    date : string
    name : string
    type : string
    details : string
}

export interface IEdit {
    id : number
    userId : number 
    stamp : string
    isEdited : boolean
    href : string
}

export interface IParticipantsInfo {
    maxParticipants : number, 
    all : IParticipant[], 
    leaders : IParticipant[], 
    moveable : IParticipant[], 
    current : IParticipant[], 
    early : IParticipant[], 
    late : IParticipant[], 
    deleted : IParticipant[]       
}

export interface INewsletter {
    id : number 
    href? : string
    date : Date
    issueDate : Date
    nextdeadline : Date
    volume : number
    number : number
    isCurrent : boolean
}
