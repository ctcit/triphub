import { App } from 'src/App';
import { INewsletterEvent } from 'src/Interfaces';
import { useState, useEffect } from 'react';
import { FullWidthLoading } from 'src/Widgets';
import { NewslettersService } from 'src/Services/NewlettersService';
import { Table } from 'reactstrap';

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
    const [isLoading, updateIsLoading] = useState<boolean>(true)

    useEffect( () => {
        (unpublished ? NewslettersService.getNewslettersUnpublishedEvents() : NewslettersService.getNewslettersEvents())
        .then( (fetchedEvents:INewsletterEvent[]) => {
            updateEvents(fetchedEvents)
            updateIsLoading(false)
        } )
    }, [])

    return (isLoading) ? <FullWidthLoading/> :
            <Table className="TripGroup" size='sm' striped={true}>
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
