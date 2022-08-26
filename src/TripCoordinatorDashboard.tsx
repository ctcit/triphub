import { Component } from 'react';
import { ITrip } from './Interfaces';
import ListGroup from 'reactstrap/lib/ListGroup';
import ListGroupItem from 'reactstrap/lib/ListGroupItem';
import * as React from 'react';
import Alert from 'reactstrap/lib/Alert';
import Container from 'reactstrap/lib/Container';
import { TripState } from './TripStates';
import { ConfigService } from './Services/ConfigService';

export class TripCoordinatorDashboard extends Component<{
    trips: ITrip[]
    setPath(path: string): void
}, {
}> {

    constructor(props: any) {
        super(props)
        this.state = {}
    }

    public render() {
        const pendingTrips = this.props.trips.filter(trip => TripState[trip.state].isRequiringApproval)
        return (
            <Container key="tripCoordiantorDashboardContainter" className={ConfigService.containerClassName + " my-3"} fluid={true}>
                <Alert color='primary'>
                    {(pendingTrips && pendingTrips.length > 0) ?
                        [<h4 key="approvalTitle">Suggested Trips</h4>,
                        <p key="approvalText">The following suggested trips require approval:</p>,
                        <ListGroup key="approvalList">
                            {pendingTrips.map((trip: ITrip, i) => {
                                const onClick = () => { this.props.setPath('/trips/' + trip.id) }
                                return <ListGroupItem tag='button' action={true} key={i} onClick={onClick}>{trip.title}</ListGroupItem>
                            })
                            }
                        </ListGroup>]
                        : <p>No trips requiring approval</p>
                    }
                </Alert>
            </Container>
        )

    }
}
