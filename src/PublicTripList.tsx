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
    const [dummy, setDummy] = useState(0)

    const isSocialOnly = props.path.startsWith('/socials')
    const isTripsOnly = props.path.startsWith('/trips')

    React.useEffect( () => {
        apiCall('GET',BaseUrl + '/trips').then( (retrievedTrips:ITrip[]) => {
            retrievedTrips = retrievedTrips.filter(trip => trip.isOpen)
            if (isTripsOnly) {
                retrievedTrips = retrievedTrips.filter( trip => !trip.isSocial)
            }
            else if (isSocialOnly) {
                retrievedTrips = retrievedTrips.filter( trip => trip.isSocial)
            }
            setTrips(retrievedTrips)
            setIsLoading(false)
        } )
    }, [dummy] )

    return <div className='triphub-public-calendar'>
            { !isSocialOnly && <p>Non-members are always welcome on our trips - please
                                <a href="https://ctc.org.nz/index.php/contact-us/27-new-members" target="_top"> contact the New Members Rep </a>
                                to get put in touch with the trip leader</p> }
            { !isTripsOnly && <p>Unless otherwise stated, socials are at 110 Waltham Road, Christchurch. Doors open at 7:30 pm
                                 with the meeting starting around 7:50 pm and the talk staring at 8:00 pm</p>}
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