import * as React from 'react'
import { Component } from 'react'
import { Container } from 'reactstrap'
import { App } from './App'
import { SwitchControl, TextAreaInputControl, InputControl, ComboBoxControl, SwitchesControl } from './Control'
import './index.css'
import { Trip } from './Trip'
import { IValidation, IMap, IArchivedRoute, ITrip } from './Interfaces'
import { MapControl } from './MapControl'
import { BaseUrl } from 'src'
import { AddDays, GetDateString, TitleFromId } from './Utilities'
import Row from 'reactstrap/lib/Row'
import Col from 'reactstrap/lib/Col'
import { TripState } from './TripStates'

export class TripDetail extends Component<{
    owner: Trip
    app: App
    forceValidation?: boolean
}, {
    editMap: boolean
    editMaps: boolean
}> {

    public href?: string
    public app: App
    private nz50MapsBySheet: { [mapSheet: string]: IMap } = {}
    private archivedRoutesById: { [archivedRouteId: string]: IArchivedRoute } = {}
    private closeDateIteration: number = 0

    constructor(props: any) {
        super(props)
        this.state = {
            editMap: false,
            editMaps: false,
        }
        this.href = this.props.owner.props.href
        this.app = this.props.app

        const nz50Maps: IMap[] = this.props.app.maps
        this.nz50MapsBySheet = {}
        nz50Maps.forEach((nz50Map: IMap) => {
            this.nz50MapsBySheet[nz50Map.sheetCode] = nz50Map
        })

        const archivedRoutes: IArchivedRoute[] = this.props.app.archivedRoutes
        this.archivedRoutesById = {}
        archivedRoutes.forEach((archivedRoute: IArchivedRoute) => {
            this.archivedRoutesById[archivedRoute.id] = archivedRoute
        })
    }

    public set(field: string, value: any): void {
        // Use an update function rather than setting the value directly,
        // as setState is not guaranteed to execute immediately, so passing
        // the current value of state here leads to data loss if two sets get bunched
        this.props.owner.setState(state => ({ trip: { ...state.trip, [field]: value } }))
    }

    public saveTrip(body: any): Promise<void> {
        if (this.href === undefined) {
            return Promise.resolve()
        } else {
            return this.app.triphubApiCall('POST', this.href as string, body, true)
        }
    }

    public calculateCloseDate(tripDate: string, length: number) {
        const tripDateAsDate = new Date(tripDate)
        // Close date is the day before for day trips, Wednesday before for longer trips
        const daysToAdd = (length < 2) ? -1 : -(((tripDateAsDate).getDay() + 3) % 7) - 1
        return GetDateString(AddDays(tripDateAsDate, daysToAdd))
    }

    public render() {
        const trip: ITrip = this.props.owner.state.trip
        const validations: IValidation[] = this.app.validateTrip(this.props.owner.state.trip)
        const approval = TripState[trip.approval || ''] || TripState.Pending
        const isSocial = trip.isSocial

        // TODO Move to service
        const getArchivedRoute = (archivedRouteId: string): Promise<IArchivedRoute | undefined> =>
            this.app.triphubApiCall('GET', BaseUrl + '/routes/' + archivedRouteId)
                .then((response: IArchivedRoute[]) => response !== null && response.length > 0 ? response[0] : undefined)

        const updateArchivedRouteSummary = (archivedRouteId: string, routeSummary: string): Promise<void> =>
            this.app.triphubApiCall('PATCH', BaseUrl + '/routes/' + archivedRouteId, routeSummary)

        const onGet = (field: string): any => this.props.owner.state.trip[field]
        const onGetInverted = (field: string): any => !this.props.owner.state.trip[field]
        const onSet = (field: string, value: any): void => this.set(field, value)
        const onSave = (field: string, value: any): Promise<void> => {
            this.set(field, value)
            return this.saveTrip({ [field]: value })
        }

        const onGetValidationMessage = (field: string): any => {
            const found: IValidation | undefined = validations.find(validation => validation.field === field && !validation.ok)
            return found ? found.message : null
        }

        const onSetInverted = (field: string, value: any): Promise<void> => {
            this.set(field, !value)
            return this.saveTrip({ [field]: !value })
        }

        const onSetTripDate = (_: string, value: any): Promise<void> => {
            const tripDate = value
            let body: any = { tripDate }

            if (this.props.owner.props.isNew) {
                const closeDate = this.calculateCloseDate(tripDate, this.props.owner.state.trip.length)
                body = { ...body, closeDate }
                this.set('closeDate', closeDate)
            }

            this.set('tripDate', tripDate)
            this.closeDateIteration++

            return this.saveTrip(body)
        }

        const onSetTripLength = (_: string, value: any): Promise<void> => {
            const length = value as number
            let body: any = { length }

            if (this.props.owner.props.isNew) {
                const closeDate = this.calculateCloseDate(this.props.owner.state.trip.tripDate, length)
                body = { ...body, closeDate }
                this.set('closeDate', closeDate)
            }

            this.set('length', length)
            this.closeDateIteration++

            return this.saveTrip(body)
        }

        const common = {
            id: 'trip',
            readOnly: trip.id !== -1 && !this.props.owner.canEditTrip,
            owner: this,
            forceValidation: this.props.forceValidation,
            onGet, onSet, onSave, onGetValidationMessage
        }

        const commonInverted = { ...common, 'onGet': onGetInverted, 'onSave': onSetInverted }
        const commonTripDate = { ...common, 'onSet': onSetTripDate }
        const commonLength = { ...common, 'onSet': onSetTripLength }
        const config = this.props.app.state.config

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
                        <ComboBoxControl field='departurePoint'
                            label={isSocial ? 'Location' : 'Departure Point'}
                            options={isSocial ? ['Club Rooms (110 Waltham Road)'] : ['Z Papanui', 'Z (formerly Caltex) Russley']}
                            {...common} />
                    </Col>
                </Row>

                <Row>
                    <Col>
                        {isSocial ?
                            <ComboBoxControl field='departureDetails' label='Time'
                                helpText='Time, any special arrangements'
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
                        <ComboBoxControl field='grade' label='Grade' options={['Easy', 'Easy/Moderate', 'Moderate', 'Moderate/Hard', 'Hard']}  {...common} />
                    </Col>
                </Row>

                <Row>
                    <Col sm={5} md={4}>
                        <SwitchControl field='isLimited' label='Limited Numbers' hidden={trip.isSocial && trip.isNoSignup} {...common} />
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
                        <TextAreaInputControl field='description' label='Description' {...common} />
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <TextAreaInputControl field='logisticInfo' label='Logistic Information'
                            helpText='Any additional information related to travel, accomodation etc' {...common} />
                    </Col>
                </Row>


                <Row hidden={!this.props.owner.canEditTrip}>
                    <Col>
                        <TextAreaInputControl field='approvalText' label={approval.label || ''}
                            helpText={`Text that was entered when '${approval.button}' was selected`}
                            {...common} readOnly={!this.props.app.amAdmin} />
                    </Col>
                </Row>
                <Row>
                    <Col sm={10}>
                        <MapControl
                            routesId='routes' routesLabel='Routes'
                            mapsId='maps' mapsLabel='Maps'
                            nz50MapsBySheet={this.nz50MapsBySheet}
                            archivedRoutesById={this.archivedRoutesById}
                            getArchivedRoute={getArchivedRoute}
                            updateArchivedRouteSummary={updateArchivedRouteSummary}
                            {...common}
                        />
                    </Col>
                </Row>
            </Container>
        )
    }

}
