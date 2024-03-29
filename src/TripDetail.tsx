import { Component } from 'react';
import { Col, Row, Container } from 'reactstrap';
import { SwitchControl, TextAreaInputControl, InputControl, SwitchesControl, InputWithSelectControl } from './Control';
import './index.css';
import { IValidation, ITrip, Role } from './Interfaces';
import { TripMap } from './TripMap';
import { AddDays, GetDateString } from './Utilities';
import { TripState } from './TripStates';
import { ConfigService } from './Services/ConfigService'
import { TripsService } from './Services/TripsService';

export class TripDetail extends Component<{
    trip: ITrip,
    isNew: boolean,
    canEditTrip: boolean,
    forceValidation?: boolean,
    role: Role,
    isOnline: boolean,
    setTripFields(fields: any, setEdited: boolean, save: boolean): Promise<void>
}, {
    editMap: boolean
    editMaps: boolean
}> {

    // private nz50MapsBySheet: { [mapSheet: string]: IMap } = {}
    private closeDateIteration: number = 0

    constructor(props: any) {
        super(props)
        this.state = {
            editMap: false,
            editMaps: false,
        }
    }

    public calculateCloseDate(tripDate: string, length: number) {
        const tripDateAsDate = new Date(tripDate)
        // Close date is the day before for day trips, Wednesday before for longer trips
        const daysToAdd = (length < 2) ? -1 : -(((tripDateAsDate).getDay() + 3) % 7) - 1
        return GetDateString(AddDays(tripDateAsDate, daysToAdd))
    }

    public render() {
        const trip: ITrip = this.props.trip
        const validations: IValidation[] = TripsService.validateTrip(trip)
        const approval = TripState[trip.approval || ''] || TripState.Pending
        const isSocial = trip.isSocial

        const onGet = (field: string): any => (trip as any)[field]
        const onGetInverted = (field: string): any => !(trip as any)[field]
        const onSet = (field: string, value: any): Promise<any> => this.props.setTripFields({[field]: value}, false, false)
        const onSave = (field: string, value: any): Promise<any> => this.props.setTripFields({[field]: value}, true, true)

        const onGetValidationMessage = (field: string): any => {
            const found: IValidation | undefined = validations.find(validation => validation.field === field && !validation.ok)
            return found ? found.message : null
        }

        const onSetInverted = (field: string, value: any): Promise<void> => this.props.setTripFields({[field]: !value}, true, true)

        const onSetTripDate = (_: string, value: any): Promise<void> => {
            const tripDate = value
            let body: any = { tripDate }

            if (trip.isSocial) {
                // For socials, the close date is ALWAYS the trip date
                const closeDate = tripDate
                body = { ...body, closeDate }
            }
            else if (this.props.isNew) {
                // For NEW events we auto-set the close date to an appropriate date when the
                // trip date is changed. Once a trip has been saved, we don't automatically
                // change the close date if the trip date changes as this can be confusing
                const closeDate = this.calculateCloseDate(tripDate, trip.length)
                body={...body, closeDate}
            }

            this.closeDateIteration++

            return this.props.setTripFields(body, true, true)
        }

        const onSetTripLength = (_: string, value: any): Promise<void> => {
            const length = value as number
            let body: any = { length }

            if (this.props.isNew) {
                const closeDate = this.calculateCloseDate(trip.tripDate, length)
                body = { ...body, closeDate }
            }

            this.closeDateIteration++

            return this.props.setTripFields(body, true, true)
        }

        const onSetIsLimited = (_: string, value: any): Promise<void> => {
            const isLimited = value
            let body: any = { isLimited }
            if (!isLimited) {
                const maxParticipants: number = 0
                body = { ...body, maxParticipants }
            }
            return this.props.setTripFields(body, true, true)
        }

        const common = {
            id: 'trip',
            readOnly: trip.id !== -1 && !this.props.canEditTrip,
            owner: this,
            forceValidation: this.props.forceValidation,
            isOnline: this.props.isOnline,
            onGet, onSet, onSave, onGetValidationMessage
        }

        const commonInverted = { ...common, 'onGet': onGetInverted, 'onSave': onSetInverted }
        const commonTripDate = { ...common, 'onSet': onSetTripDate }
        const commonLength = { ...common, 'onSet': onSetTripLength }
        const commonIsLimited = { ...common, 'onSave': onSetIsLimited }

        const config = ConfigService.Config

        const openDateHelp = trip.isSocial ?
            'When the event will be visible on the socials list' :
            'When sign-up opens and the trip is visible on the trips list'

        const openDateLabel = trip.isSocial ? 'Visible Date' : 'Open Date'

        return (
            <Container fluid={true}>
                <Row>
                    <Col>
                        <InputControl field='title' label='Title' type='text' {...common} />
                    </Col>
                </Row>

                <Row>
                    <Col sm={5} md={4}>
                        <InputControl field='tripDate' label={isSocial ? 'Social Date' : 'Trip Date'} type='date' {...commonTripDate} />
                    </Col>
                    <Col sm={5} md={4} hidden={isSocial}>
                        <InputControl field='length' label='Length in days' type='number' min={0} hidden={trip.isSocial} {...commonLength} />
                    </Col>
                </Row>

                <Row>
                    <Col sm={5} md={4}>
                        <InputControl field='openDate' label={openDateLabel} type='date' helpText={openDateHelp} {...common} />
                    </Col>
                    <Col sm={2} md={3} hidden={!trip.isSocial}>
                        <SwitchControl field='isNoSignup' label='Sign up list' {...commonInverted} />
                    </Col>
                    <Col sm={5} md={4} hidden={isSocial && trip.isNoSignup}>
                        <InputControl field='closeDate' label='Close Date' type='date' helpText='When sign-up closes' {...common} key={'closeDate' + this.closeDateIteration} />
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <InputWithSelectControl field='departurePoint'
                            label={isSocial ? 'Location' : 'Departure Point'}
                            type='text'
                            options={isSocial ? ['Club Rooms (110 Waltham Road)'] : ['Z Papanui', 'Z (formerly Caltex) Russley']}
                            {...common} />                    
                    </Col>
                </Row>

                <Row>
                    <Col>
                        {isSocial ?
                            <InputWithSelectControl field='departureDetails' label='Time'
                                helpText='Time, any special arrangements'
                                type='text'
                                options={['7:30 pm (talks start at 8 pm)']}  {...common} /> :
                            <InputControl field='departureDetails' label='Departure Details'
                                helpText='Time, any special arrangements' type='text' {...common} />
                        }
                    </Col>
                </Row>

                <Row>
                    <Col sm={4}>
                        <InputControl field='cost' label='Cost' type='text'
                            helpText={isSocial ?
                                'Leave blank for free events' : 'Estimated cost, including transport, huts etc'}
                            {...common} />
                    </Col>
                    <Col sm={8}>
                        <InputWithSelectControl field='grade' label='Grade' 
                            type='text' options={['Easy', 'Easy/Moderate', 'Moderate', 'Moderate/Hard', 'Hard']}  
                            {...common} />
                    </Col>
                </Row>

                <Row>
                    <Col sm={5} md={4}>
                        <SwitchControl field='isLimited' label='Limited Numbers' hidden={trip.isSocial && trip.isNoSignup} {...commonIsLimited} />
                    </Col>
                    <Col sm={5} md={4}>
                        <InputControl field='maxParticipants' label={isSocial ? 'Maximum Attendees' : 'Maximum trampers'}
                            type='number' min={0} hidden={!trip.isLimited || (trip.isSocial && trip.isNoSignup)} {...common} />
                    </Col>
                    <Col sm={3} md={2}>
                        <SwitchesControl field='prerequisites' label='Prerequisite Equipment'
                            hidden={trip.isSocial && trip.isNoSignup}
                            options={config.prerequisiteEquipment}
                            allOptions={`${config.prerequisiteEquipment},${config.prerequisiteSkills}`}
                            {...common} />
                    </Col>
                    <Col sm={3} md={2}>
                        <SwitchesControl field='prerequisites' label='Prerequisite Skills'
                            hidden={trip.isSocial && trip.isNoSignup}
                            options={config.prerequisiteSkills}
                            allOptions={`${config.prerequisiteEquipment},${config.prerequisiteSkills}`}
                            {...common} />
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <TextAreaInputControl field='description' label='Description' {...common} onSet={undefined} />
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <TextAreaInputControl field='logisticInfo' label='Logistic Information'
                            helpText='Any additional information related to travel, accomodation etc' {...common} onSet={undefined} />
                    </Col>
                </Row>


                <Row hidden={!this.props.canEditTrip}>
                    <Col>
                        <TextAreaInputControl field='approvalText' label={approval.label || ''}
                            helpText={`Text that was entered when '${approval.button}' was selected`}
                            {...common} readOnly={!this.amAdmin} onSet={undefined} />
                    </Col>
                </Row>
                <Row>
                    <Col sm={10}>
                        <TripMap 
                            routesId='routes' routesLabel='Routes'
                            mapsId='maps' mapsLabel='Maps'
                            leafletMapId='tripmap'
                            {...common}
                        />
                    </Col>
                </Row>
            </Container>
        )
    }

    private get amAdmin(): boolean { return this.props.role >= Role.Admin }

}
