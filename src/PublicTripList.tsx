import * as React from 'react';
import { useState }  from 'react';
import { Badge } from 'reactstrap';
import { BaseUrl } from 'src';
import { ITrip } from './Interfaces'
import { apiCall, GetDateFullMonth, GetLength } from './Utilities';
import { FullWidthLoading } from './Widgets';

export interface IPublicCalendarProps {
    path: string
}

export const PublicTripList = (props:IPublicCalendarProps) : JSX.Element  => {
    const [trips, setTrips] = useState([] as ITrip[])
    const [isLoading, setIsLoading] = useState(true)
    const [dummy, _] = useState(0)

    const isSocialOnly = props.path.startsWith('/socials')
    const isTripsOnly = props.path.startsWith('/trips')

    React.useEffect( () => {
        apiCall('GET',BaseUrl + '/trips').then( (retrievedTrips:ITrip[]) => {
            retrievedTrips = retrievedTrips.filter(trip => trip.state === 'Open' || trip.state === 'MyTrips')
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
            { !isSocialOnly && <p>Non-members are always welcome on our trips - 
                                please <a href="/about/contact-us" target="_top">contact the New Members Rep</a> to
                                get put in touch with the trip leader.</p> }
            { !isTripsOnly && <p>Unless otherwise stated, socials are at 110 Waltham Road, Christchurch. Doors open at 7:00 pm
                                 with the meeting starting around 7:20 pm and the talk staring at 7:30 pm</p>}
            { isLoading && <FullWidthLoading/> }
            { trips.map( (trip) =>
                <div key={trip.id} className='pb-2' >
                    <div>
                        <h3 className="d-inline">
                            {GetDateFullMonth(trip.tripDate)}: {trip.title}
                        </h3>
                        {(trip.isSocial) && <Badge className="align-middle mb-2 ms-2 badge-green">Social</Badge>}
                        {trip.isFull && <Badge color='danger' className="align-middle mb-2 ms-2">Full</Badge>}
                    </div>
                    {!trip.isSocial && 
                    <dl className='public-calendar-definition my-2'>
                        <dt>Length:</dt>
                        <dd>{GetLength(trip.length, new Date(trip.tripDate))}</dd>
                        <dt>Grade:</dt>
                        <dd>{trip.grade}</dd>
                        <dt>Aproximate Cost:</dt>
                        <dd>{trip.cost}</dd>
                        <dt>Departure Point:</dt>
                        <dd>{trip.departurePoint} {trip.departureDetails}</dd>
                        <dt>Leader:</dt>
                        <dd>{trip.leaders}</dd>
                        {(trip.prerequisites !== undefined && trip.prerequisites !== null && trip.prerequisites.length > 0) &&
                            <><dt>Prerequisites:</dt>
                                <dd>{trip.prerequisites}</dd></>}
                    </dl>
                    }
                    {trip.isSocial && 
                    <div className="py-2">
                        <dl className='public-calendar-definition'>
                            <dt>Location:</dt>
                            <dd>{trip.departurePoint} {trip.departureDetails}</dd>
                        </dl>
                    </div>
                    }
                    {trip.isFull &&
                        <p><i>Sorry, this trip is full.</i></p>
                    }
                    <p className='public-calendar-description'>{trip.description}</p>
                    <p>{trip.logisticInfo}</p>
                </div>,
            )}
    </div>
}