import { App } from 'src/App';
import { INewsletterEvent } from 'src/Interfaces';
import { useState, useEffect } from 'react';
import { BaseUrl } from 'src';
import * as React from 'react';
import Table from 'reactstrap/lib/Table';

export interface INewsletterEventProps {
    app:App,
    event:INewsletterEvent
}

const NewsletterEvent = (props:INewsletterEventProps) : JSX.Element => {
    const eventType = (!props.event.social) ? "Trip" : "Social"

    const onClick = () : void => {
        props.app.setPath('/trips/' + props.event.trip_id)
    }

    return <tr onClick={onClick}>
                <td className='mobile-only'/>
                <td>{props.event.dateDisplay}</td>
                <td>{eventType}</td>
                <td>{props.event.leader}</td>
                <td>{props.event.title}</td>
            </tr>
}

export interface INewsletterEventsListProps {
    app:App,
    unpublished?:boolean
}

export const NewsletterEventsList = ({app, unpublished}:INewsletterEventsListProps): JSX.Element  => {
    const [events, updateEvents] = useState<INewsletterEvent[]>([])

    useEffect( () => {
        const apiUrl = unpublished ? BaseUrl + "/newsletters/unpublishedEvents" : BaseUrl + "/newsletters/events"
        app.apiCall('GET', apiUrl)
        .then( (fetchedEvents:INewsletterEvent[]) => {
            updateEvents(fetchedEvents)
        } )
    }, [])

    return <Table className="TripGroup" size='sm' striped={true}>
                <thead>
                    <tr>
                        <th className='mobile-only'/>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Leader</th>
                        <th>Title</th>
                    </tr>
                </thead>
                <tbody>
                    {(events !== null) && events.map((event, index) => <NewsletterEvent event={event} app={app} key={'event'+index}/>)}
                </tbody>
            </Table>
}

NewsletterEventsList.defaultProps = {
    unpublished: false
}
