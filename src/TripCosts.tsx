import { ListGroup, ListGroupItem, Container, Row, Col, Form, Input } from 'reactstrap';
import { Component, ReactNode } from 'react';
import { IParticipant, ITrip, ITripCostCalculations, IValidation } from './Interfaces';
import { BindMethods } from './Utilities';
import { InputControl, InputWithSelectControl } from './Control';
import { TripCostsParticipant } from './TripCostsParticipant';
import { MembersService } from './Services/MembersService';
import { TripsService } from './Services/TripsService';
import { Accordian } from './Accordian';
import { CommonDestinationsService } from './Services/CommonDestinationsService'

export class TripCosts extends Component<{
    trip: ITrip
    participants: IParticipant[]
    currentParticipants: IParticipant[]
    canEditTrip: boolean
    setTripFields: (fields: any, setEdited: boolean, save: boolean) => Promise<any>
    setTripParticipants: (participants: IParticipant[], setEdited: boolean) => void
    forceValidation?: boolean
}, {
}> {
    public calculations: ITripCostCalculations = {
        distanceOneWay: 0,
        participantsCount: 0,
        totalVehicleCost: 0,
        companyVehicleCount: 0,
        payingParticipantsCount: 0, // paying vehicle fee
        calculatedVehicleFee: 0,
        roundedCalculatedVehicleFee: 0,
        vehicleFee: 0,
        totalVehicleFeeToCollect: 0,
        totalNonMemberFeeToCollect: 0,
        totalOtherFeesToCollect: 0,
        participants: {}
    }

    constructor(props: any) {
        super(props)
        this.state = {}

        BindMethods(this)
    }

    public calculateCosts(): void {
        const trip: ITrip = this.props.trip

        // TODO
        trip.distanceOneWay = trip.distanceOneWay === undefined ? 100 : trip.distanceOneWay // TODO - better default or none?
        trip.participantsCount = trip.participantsCount === undefined ? null : trip.participantsCount
        trip.vehicleFee = trip.vehicleFee === undefined ? null : trip.vehicleFee

        const currentParticipants: IParticipant[] = this.props.currentParticipants

        this.calculations = {
            distanceOneWay: trip.distanceOneWay,
            participantsCount: trip.participantsCount !== null ? trip.participantsCount : currentParticipants.length,
            totalVehicleCost: 0,
            companyVehicleCount: 0,
            payingParticipantsCount: 0, // paying vehicle fee
            calculatedVehicleFee: 0,
            roundedCalculatedVehicleFee: 0,
            vehicleFee: 0,
            totalVehicleFeeToCollect: 0,
            totalNonMemberFeeToCollect: 0,
            totalOtherFeesToCollect: 0,
            participants: {}
        }
        currentParticipants.forEach(p => {

            this.calculations.participants[p.id] = {
                broughtVehicle: p.broughtVehicle ?? p.isVehicleProvider ?? false, // TODO - remove p.isVehicleProvider
                isCompanyVehicle: p.isCompanyVehicle,
                totalDistance: p.totalDistance ?? null,
                ratePerKm: p.ratePerKm ?? null,
                vehicleCost: !p.isCompanyVehicle ? null : p.vehicleCost ?? null,
                vehicleReimbursement: p.vehicleReimbursement ?? null, // vehicle cost less vehicle fee
            
                // all
                vehicleFee: p.vehicleFee ?? null,
                nonMemberFee: p.nonMemberFee ?? null,
                otherFees: p.otherFees ?? null, // e.g. hut, gear hire fees
                toPay: p.toPay ?? null, // negative if to be reimbursed
                paid: p.paid ?? null // negative if reimbursed
            }
        })

        const actualVehicleProviders: IParticipant[] = currentParticipants.filter(p => this.calculations.participants[p.id].broughtVehicle);
        const others: IParticipant[] = currentParticipants.filter(p => !this.calculations.participants[p.id].broughtVehicle);

        // calculate total vehicle cost
        const defaultTotalDistance = this.tripDistanceOneWayRoundedUp(trip.distanceOneWay) * 2
        actualVehicleProviders.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.totalDistance = c.totalDistance != null ? c.totalDistance : defaultTotalDistance
            c.ratePerKm = c.ratePerKm != null ? c.ratePerKm : this.ratePerKm(p.engineSize)
            c.vehicleCost = c.vehicleCost != null ? c.vehicleCost : Math.ceil(c.totalDistance * c.ratePerKm)
            this.calculations.totalVehicleCost += c.vehicleCost
        })

        // handle company vehicles
        this.calculations.companyVehicleCount = actualVehicleProviders.filter(p => p.isCompanyVehicle).length
        this.calculations.payingParticipantsCount = this.calculations.participantsCount - this.calculations.companyVehicleCount

        // calculate vehicle fee per paying participant
        this.calculations.calculatedVehicleFee = this.calculations.payingParticipantsCount > 0 ? 
            this.calculations.totalVehicleCost / this.calculations.payingParticipantsCount : 0
        this.calculations.roundedCalculatedVehicleFee = Math.ceil(this.calculations.calculatedVehicleFee)
        this.calculations.vehicleFee = trip.vehicleFee !== null ? trip.vehicleFee : this.calculations.roundedCalculatedVehicleFee

        // calculate fees for all participants
        currentParticipants.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.vehicleFee = c.vehicleFee != null ? c.vehicleFee : // manually overridden fee (unused)
                c.isCompanyVehicle ? 0 : // company vehicle - no fee
                this.calculations.vehicleFee // otherwise, calculated fee
            this.calculations.totalVehicleFeeToCollect += !c.broughtVehicle ? c.vehicleFee : 0
            c.nonMemberFee = c.nonMemberFee != null ? c.nonMemberFee : !p.memberId ? this.nonMemberFee() : 0
            this.calculations.totalNonMemberFeeToCollect += c.nonMemberFee
            c.otherFees = c.otherFees ?? 0
            this.calculations.totalOtherFeesToCollect += c.otherFees
        })

        // calculate vehicle reimbursements
        let totalReimbursements = 0
        actualVehicleProviders.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.vehicleReimbursement = c.vehicleReimbursement !== null ? c.vehicleReimbursement :  // manually overridden (unused)
                (c.vehicleCost ?? 0) - (c.vehicleFee ?? 0)
            totalReimbursements += c.vehicleReimbursement
        })
        // handle excess vehicle funds - distribute to non-company vehicle providers (unless there are none)
        let excessVehicleFunds = this.calculations.totalVehicleFeeToCollect - totalReimbursements
        const haveNonCompanyVehicleProviders = actualVehicleProviders.length > this.calculations.companyVehicleCount
        while (excessVehicleFunds > 0) {
            actualVehicleProviders.forEach(p => {
                if (excessVehicleFunds > 0 && (!p.isCompanyVehicle || !haveNonCompanyVehicleProviders)) {
                    const c = this.calculations.participants[p.id]
                    const addExcess = Math.min(1, excessVehicleFunds)
                    c.vehicleReimbursement = (c.vehicleReimbursement ?? 0) + addExcess
                    excessVehicleFunds =- addExcess
                }
            })
        }

        // calculate total to pay/reimburse for each participant
        actualVehicleProviders.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.toPay =  (c.nonMemberFee ?? 0) + (c.otherFees ?? 0) - (c.vehicleReimbursement ?? 0)
        })
        others.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.toPay = (c.vehicleFee ?? 0) + (c.nonMemberFee ?? 0) + (c.otherFees ?? 0)
        })
    }

    // round up to next 10km
    public tripDistanceOneWayRoundedUp(distanceOneWay: number): number {
        return Math.ceil(distanceOneWay / 10.0) * 10.0
    }

    public ratePerKm(engineSizeCC: number): number {
        return engineSizeCC <= 1500 ? 0.82 : engineSizeCC <= 2000 ? 0.93 : 1.14;
    }

    public nonMemberFee(): number {
        return 5.0;
    }

    public setParticipant(id: number, data: { [id: string]: any }, save: boolean): Promise<IParticipant> {
        const participants = [...this.props.participants]
        const index = participants.findIndex(p => p.id === id)
        const participant = { ...participants[index], ...data }

        participants[index] = participant
        
        // clear any fixed vehicle cost if not company vehicle
        if (!participant.isCompanyVehicle) { 
            participant.vehicleCost = null;
        }

        this.props.setTripParticipants(participants, true)

        return Promise.resolve(participant) // TODO
        return save? 
            TripsService.postTripParticipantUpdate(this.props.trip.id, id, data) :
            Promise.resolve(participant)
    }
    
    public render() {
        const trip: ITrip = this.props.trip
        const validations: IValidation[] = TripsService.validateTrip(this.props.trip)

        const currentParticipants = this.props.currentParticipants

        this.calculateCosts();

        const onGet = (field: string): any => this.props.trip[field]
        const onSet = (field: string, value: any): Promise<ITrip> => 
            this.props.setTripFields({[field]: this.sanitizeNumber(value)}, false, false)
        const onSave = (field: string, value: any): Promise<ITrip> => 
            this.props.setTripFields({[field]: this.sanitizeNumber(value)}, true, true)
        const onGetValidationMessage = (field: string): any => {
            return (validations.find(v => v.field === field && !v.ok) || {} as any).message
        }
        const onGetValidations = () => validations;
        const setParticipant = (id: number, data: { [id: string]: any }, save: boolean) => this.setParticipant(id, data, save)

        // const onSetInverted = (field: string, value: any): Promise<ITrip> => this.props.setTripFields({[field]: !value}, true, true)

        const common = {
            id: 'trip',
            readOnly: trip.id !== -1 && !this.props.canEditTrip,
            owner: this,
            forceValidation: this.props.forceValidation,
             onGet, onSet, onSave, onGetValidationMessage
        }

        const actualVehicleProviders = currentParticipants.filter(p => this.calculations.participants[p.id].broughtVehicle);
        const others = currentParticipants.filter(p => !this.calculations.participants[p.id].broughtVehicle);

        const groupedCommonDistances = Object.entries(CommonDestinationsService.getByGroups()).map(([area, toValues]) => {
            return {
                label: area,
                options: Object.entries(toValues).flatMap(([to, fromValues]) => {
                    return Object.entries(fromValues).map(([from, distance]) => {
                        return {
                            value: distance,
                            label: to + ' from ' + from + ' (' + distance + 'km)'
                        }
                    })
                })
            }
        })

        return [
            <Container key='parameters-initial' fluid={true}>
                <Row>
                    <Col sm={6} md={6}>
                        <InputWithSelectControl field='distanceOneWay' label='Distance one way (km)'
                            type='number' min={0} step={10} hidden={false} 
                            options={groupedCommonDistances}
                            {...common} />
                    </Col>
                </Row>

                <Accordian id={'parameters-continued'} className='others-section'
                    headerClassName='others-header' expanded={false}
                    title={'More Details'}>
                    <Form key='form' className='indentedparticipants form'>
                        <Container fluid={true}>
                            <Row>
                                <Col sm={5} md={4}>
                                    <InputControl field='participantsCount' label='Total number of people on the trip'
                                        placeholder={this.calculations.participantsCount}
                                        type='number' min={0} hidden={false} {...common} />
                                </Col>
                                <Col sm={5} md={4}>
                                    <InputControl field='companyVehicleCount' label='Total number of company vehicles'
                                        placeholder={this.calculations.companyVehicleCount}
                                        type='number' min={0} hidden={false} {...common} readOnly={true} />
                                </Col>
                                <Col sm={5} md={4}>
                                    <InputControl field='payingParticipantsCount' label='Number to pay vehicle costs (number on trip less company vehicle drivers)'
                                        placeholder={this.calculations.payingParticipantsCount}
                                        type='number' min={0} hidden={false} {...common} readOnly={true} />
                                </Col>
                            </Row>
                            <Row>
                                <Col sm={5} md={4}>
                                    <InputControl field='totalVehicleCost' label='Total vehicle costs ($)'
                                        placeholder={this.calculations.totalVehicleCost}
                                        type='number' min={0} hidden={false} {...common} readOnly={true} />
                                </Col>
                                {/* <Col sm={5} md={4}>
                                    <InputControl field='calculatedVehicleFee' label='Costs per person ($)'
                                        placeholder={this.calculations.calculatedVehicleFee}
                                        type='number' min={0} hidden={false} {...common} readOnly={true} />
                                </Col> */}
                                <Col sm={5} md={4}>
                                    <InputControl field='roundedCalculatedVehicleFee' label='Costs per person rounded up ($)'
                                        placeholder={this.calculations.roundedCalculatedVehicleFee}
                                        type='number' min={0} hidden={false} {...common} readOnly={true} />
                                </Col>
                                <Col sm={5} md={4}>
                                    <InputControl field='vehicleFee' label='Vehicle fee ($) to collect from particpants (excluding drivers)'
                                        placeholder={this.calculations.vehicleFee}
                                        type='number' min={0} hidden={false} {...common} />
                                </Col>
                            </Row>
                        </Container>
                    </Form>
                </Accordian>

                <Row>
                    <Col sm={5} md={4}>
                        <InputControl field='totalVehicleFeeToCollect' label='Total vehicle fees ($) to collect from non-drivers'
                            placeholder={this.calculations.totalVehicleFeeToCollect}
                            type='number' min={0} hidden={false} {...common} readOnly={true} />
                    </Col>
                    <Col sm={5} md={4}>
                        <InputControl field='totalNonMemberFeeToCollect' label='Total non-member ($) fees to collect'
                            placeholder={this.calculations.totalNonMemberFeeToCollect}
                            type='number' min={0} hidden={false} {...common} readOnly={true} />
                    </Col>
                    <Col sm={5} md={4}>
                        <InputControl field='totalOtherFeesToCollect' label='Total other fees ($) to collect'
                            placeholder={this.calculations.totalOtherFeesToCollect}
                            type='number' min={0} hidden={false} {...common} readOnly={true} />
                    </Col>
                </Row>

            </Container>,

            <ListGroup key='costs-participants'>
                <ListGroupItem hidden={actualVehicleProviders.length >= 0}>
                    <div><b>No Vehicle Providers</b></div>
                </ListGroupItem>
                <ListGroupItem hidden={actualVehicleProviders.length === 0}>
                    <div><b>Vehicle Providers</b></div>
                    {
                        actualVehicleProviders.map(p => {
                            const pc = this.calculations.participants[p.id];
                            return <TripCostsParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} 
                                participant={p}
                                participantCosts={pc}
                                canEdit = {this.props.canEditTrip || MembersService.Me.id === p.memberId}
                                onGetValidations={onGetValidations}
                                setParticipant={setParticipant}
                            />
                        })
                    }
                </ListGroupItem>
                <ListGroupItem hidden={others.length === 0}>
                    <div><b>Others</b></div>
                    {
                        others.map(p => {
                            const pc = this.calculations.participants[p.id];
                            return <TripCostsParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`}
                                participant={p}
                                participantCosts={pc}
                                canEdit = {this.props.canEditTrip || MembersService.Me.id === p.memberId}
                                onGetValidations={onGetValidations}
                                setParticipant={setParticipant}
                            />
                        })
                    }
                </ListGroupItem>
            </ListGroup>,

        ]
    }

    private sanitizeNumber(value: number): number | null {
        return isNaN(value) ? null : value
    }
}
