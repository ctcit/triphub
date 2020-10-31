import * as React from 'react';
import {useState}  from 'react';
import { Alert, Container } from 'reactstrap';
import { BaseUrl } from 'src';
import { Accordian } from './Accordian';
import { StateFilter } from './Calendar';
import {ITrip, TripGroup} from './Interfaces'
import { apiCall, GetDate, GetLength } from './Utilities';
import { FullWidthLoading } from './Widgets';

export interface IPublicCalendarProps {
    path: string
}

export const PublicTripList = (props:IPublicCalendarProps) : JSX.Element  => {
    const [trips, setTrips] = useState([] as ITrip[])
    const [isLoading, setIsLoading] = useState(true)
    apiCall('GET',BaseUrl + '/trips').then( (retrievedTrips:ITrip[]) => {
        retrievedTrips = retrievedTrips.filter(trip => trip.tripGroup === TripGroup.OpenTrip)
        if (props.path.startsWith('/trips')) {
            retrievedTrips = retrievedTrips.filter( trip => !trip.isSocial)
        }
        else if (props.path.startsWith('/socials')) {
            retrievedTrips = retrievedTrips.filter( trip => trip.isSocial)
        }
        setTrips(retrievedTrips)
        setIsLoading(false)
    } )

    return <div className='triphub-public-calendar'>
            { isLoading && <FullWidthLoading/> }
            { trips.map( (trip) =>
            <Accordian id={'trip'+trip.id} title={GetDate(trip.tripDate)+': '+trip.title} key={trip.id} className='my-0'>
                {!trip.isSocial && <div className="p-2">
                    <dl className='public-calendar-definition'>
                        <dt>Length:</dt>
                        <dd>{GetLength(trip.length, new Date(trip.tripDate))}</dd>
                        <dt>Grade:</dt>
                        <dd>{trip.grade}</dd>
                        <dt>Aproximate Cost:</dt>
                        <dd>{trip.cost}</dd>
                        <dt>Departure Point:</dt>
                        <dd>{trip.departurePoint} {trip.departureDetails}</dd>
                    </dl>
                    <p>{trip.description}</p>
                    <p>{trip.logisticInfo}</p>
                </div>}
                {trip.isSocial && <div className="p-2">
                    <dl className='public-calendar-definition'>
                        <dt>Location:</dt>
                        <dd>{trip.departurePoint} {trip.departureDetails}</dd>
                    </dl>
                    <p>{trip.description}</p>
                    <p>{trip.logisticInfo}</p>
                </div>}
            </Accordian>,
            )}
          </div>
}