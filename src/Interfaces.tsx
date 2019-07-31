export enum TripState { My_Trip, Open_Trip, Closed_Trip, Suggested_Trip, Deleted_Trip }

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
    open_date : string
    close_date : string
    trip_date : string
    cost : string
    departure_point : string
    description : string
    grade : string
    is_social : boolean
    length : number
    logistic_info : string
    map_1 : string
    map_2 : string
    map_3 : string
    map_html : string
    is_deleted : boolean
    is_approved : boolean
    max_participants : number
    leaders? : string
    trip_state : TripState
    is_open : boolean
    edits_href? : string
}

export interface IParticipant {
    id : number
    href? : string
    member_id : number
    name : string
    email : string
    phone : string
    emergency_contact : string
    is_leader : boolean
    is_plb_provider : boolean
    is_vehicle_provider : boolean
    is_deleted : boolean
    logistic_info : string
    vehicle_rego : string
    display_priority? : number
}

export interface IMember {
    id : number 
    name : string
    email : string
    phone : string
    emergency_contact : string
    role : string
    is_me : boolean
    is_member : boolean
}

export interface IConfig {
    edit_refresh_in_sec : number
    print_lines : number
}

export interface IMap {
    name : string
    title : string
    group : string
}


export interface IEdit {
    id : number
    user_id : number 
    stamp : string
    is_edited : boolean
    href : string
}

