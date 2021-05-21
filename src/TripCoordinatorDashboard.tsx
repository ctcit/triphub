import { Component } from 'react';
import { App } from './App';
import { ITrip } from './Interfaces';
import ListGroup from 'reactstrap/lib/ListGroup';
import ListGroupItem from 'reactstrap/lib/ListGroupItem';
import * as React from 'react';
import Alert from 'reactstrap/lib/Alert';
import Container from 'reactstrap/lib/Container';
import { TripState } from './TripStates';

export class TripCoordinatorDashboard extends Component<{
    app: App,
    trips: ITrip[],
}, {
}> {

    constructor(props: any) {
        super(props)
        this.state = {}
    }

    public render() {
        const pendingTrips = this.props.trips.filter(trip => TripState[trip.state].isRequiringApproval)
        return (
            <Container key="tripCoordiantorDashboardContainter" className={this.props.app.containerClassName + " my-3"} fluid={true}>
                <Alert color='primary'>
                    {(pendingTrips && pendingTrips.length > 0) ?
                        [<h4 key="approvalTitle">Suggested Trips</h4>,
                        <p key="approvalText">The following suggested trips require approval:</p>,
                        <ListGroup key="approvalList">
                            {pendingTrips.map((trip: ITrip, i) => {
                                const onClick = () => { this.props.app.setPath('/trips/' + trip.id) }
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
