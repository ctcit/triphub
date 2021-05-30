export enum Role { NonMember, Member, TripLeader, Admin, Webmaster }


export interface IState {
    id: string
    status: string
    groupTitle?: string
    button?: string
    icon?: string
    prompt?: string
    label?: string
    nextStates: string[]
    roleToChange: Role
    roleToView: Role
    isRequiringApproval?: boolean
}

export interface IValidation {
    field: string
    ok: boolean
    message: string
}

export interface ITrip {
    id: number
    title: string
    role?: string
    openDate: string
    closeDate: string
    tripDate: string
    cost: string
    departurePoint: string
    departureDetails: string
    description: string
    grade: string
    isSocial: boolean
    isNoSignup: boolean
    length: number
    logisticInfo: string
    maps: string[]
    routes: number[][][]
    mapHtml: string
    isDeleted: boolean
    approval: string
    approvalText: string
    isLimited: boolean
    maxParticipants: number
    prerequisites?: string
    leaders?: string
    state: string
}

export interface IParticipant {
    id: number
    memberId: number
    name: string
    email: string
    phone: string
    emergencyContactName: string
    emergencyContactPhone: string
    isLeader: boolean
    isPlbProvider: boolean
    isVehicleProvider: boolean
    isDeleted: boolean
    logisticInfo: string
    vehicleRego: string
    displayPriority?: number
    showMenu?: boolean
}

export interface IMember {
    id: number
    name: string
    email: string
    phone: string
    emergencyContactName: string
    emergencyContactPhone: string
    role: Role
    isMe: boolean
    isMember: boolean
}

export interface IConfig {
    editRefreshInSec: number
    printLines: number
    calendarStartOfWeek: number
    prerequisiteEquipment: string
    prerequisiteSkills: string
}

export interface IMap {
    coords: any
    sheetCode: string
    name: string
}

export interface IArchivedRoute {
    id: number;
    memberId: number;
    tripHubId: number;
    ctcRoutesId: number;
    tripReportsId: number;
    source: string;
    title: string;
    description: string;
    date: string;
    creationDate: string;
    gpxFilename: string;
    gpx: string; // not stored in routes table
    bounds: Array<[number, number]>;
    routes: Array<Array<[number, number]>>;
    summarizedRoutes: Array<Array<[number, number]>>;
    firstName: string;
    lastName: string;
}


export interface IHoliday {
    date: string
    name: string
    type: string
    details: string
}

export interface IEdit {
    id: number
    userId: number
    stamp: string
    isEdited: boolean
    href: string
}

export interface IParticipantsInfo {
    maxParticipants: number,
    all: IParticipant[],
    leaders: IParticipant[],
    moveable: IParticipant[],
    current: IParticipant[],
    early: IParticipant[],
    late: IParticipant[],
    deleted: IParticipant[]
}

// The field names in these interfaces have to match column names in the db
// exactly, hence the inconsitent capitalisation
export interface INewsletter {
    id: number
    date: string
    issueDate: string
    nextdeadline: string
    volume: number
    number: number
    isCurrent: boolean
}

export interface ITripReport {
    id: number
    trip_type: string
    year: number
    month: number
    day: number
    duration: number
    date_display: string
    user_set_date_display: boolean
    title: string
    upload_date: string
}

export interface INewsletterTripReport {
    tripreport: number
    newsletter: number
    publish: boolean
}

export interface INotice {
    id: number
    section: string
    date: string
    publish: boolean
    title: string
    text: string
    order: number
}

export interface INewsletterEvent {
    trip_id: number
    dateDisplay: string
    social: boolean
    trip: boolean
    title: string
    grade: string
    leader: string
    leaderPlus: string
    leaderPhone: string
    leaderEmail: string
    close1: string
    map1: string
    map2: string
    map3: string
    cost: string
    issueDate: string
}