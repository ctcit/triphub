import * as React from 'react';
import { ListGroup, ListGroupItem, Container, Row, Col } from 'reactstrap';
import { Component } from 'react';
import { IParticipant, ITrip, ITripCostCalculations, IValidation } from './Interfaces';
import { BindMethods } from './Utilities';
import { InputControl } from './Control';
import { TripCostsParticipant } from './TripCostsParticipant';
import { MembersService } from './Services/MembersService';
import { TripsService } from './Services/TripsService';

export class TripCosts extends Component<{
    trip: ITrip
    currentParticipants: IParticipant[]
    canEditTrip: boolean
    setTripFields: (fields: any, setEdited: boolean, save: boolean) => Promise<any>
    setTripParticipants: (participants: IParticipant[], setEdited: boolean) => void
    forceValidation?: boolean
}, {
}> {
    public calculations: ITripCostCalculations

    constructor(props: any) {
        super(props)
        this.state = {}

        BindMethods(this)
    }

    public calculateCosts(): void {
        const trip: ITrip = this.props.trip

        // TODO
        trip.distanceOneWay = trip.distanceOneWay === undefined ? 100 : trip.distanceOneWay // TODO
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
                broughtVehicle: p.broughtVehicle ?? false,
                totalDistance: p.totalDistance ?? null,
                ratePerKm: p.ratePerKm ?? null,
                vehicleCost: p.vehicleCost ?? null, 
                vehicleExcess: p.vehicleExcess ?? null,
            
                // all
                vehicleFee: p.vehicleFee ?? null,
                nonMemberFee: p.nonMemberFee ?? null,
                otherFees: p.otherFees ?? null, // e.g. hut, gear hire fees
                toPay: p.toPay ?? null, // negative if to be reimbursed
                paid: p.paid ?? null // negative if reimbursed
            }
        })

        const vehicleProviders: IParticipant[] = currentParticipants.filter(p => p.broughtVehicle);
        const others: IParticipant[] = currentParticipants.filter(p => !p.broughtVehicle);

        // calculate total vehicle cost
        const defaultTotalDistance = this.tripDistanceOneWayRoundedUp(trip.distanceOneWay) * 2
        vehicleProviders.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.totalDistance = p.totalDistance != null ? p.totalDistance : defaultTotalDistance
            c.ratePerKm = p.ratePerKm != null ? p.ratePerKm : this.ratePerKm(p.engineSize)
            c.vehicleCost = p.vehicleCost != null ? p.vehicleCost : Math.ceil(c.totalDistance * c.ratePerKm)
            this.calculations.totalVehicleCost += c.vehicleCost
        })

        // handle company vehicles
        this.calculations.companyVehicleCount = vehicleProviders.filter(p => p.vehicleCost != null).length
        this.calculations.payingParticipantsCount = this.calculations.participantsCount - this.calculations.companyVehicleCount

        // calculate vehicle fee per paying participant
        this.calculations.calculatedVehicleFee = this.calculations.payingParticipantsCount > 0 ? 
            this.calculations.totalVehicleCost / this.calculations.payingParticipantsCount : 0
        this.calculations.roundedCalculatedVehicleFee = Math.ceil(this.calculations.calculatedVehicleFee)
        this.calculations.vehicleFee = trip.vehicleFee !== null ? trip.vehicleFee : this.calculations.roundedCalculatedVehicleFee

        // calculate fees for all participants
        currentParticipants.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.vehicleFee = p.vehicleFee != null ? p.vehicleFee : // manually overridden fee (unused)
                p.vehicleCost != null ? 0 : // company vehicle - no fee
                c.vehicleCost !== null ? this.calculations.roundedCalculatedVehicleFee - c.vehicleCost : // non-company vehicle - reimburse vehicle cost less (calculated) fee
                this.calculations.vehicleFee // otherwise, calculated fee
            this.calculations.totalVehicleFeeToCollect += c.vehicleFee
            c.nonMemberFee = p.nonMemberFee != null ? p.nonMemberFee : !p.memberId ? this.nonMemberFee() : 0
            this.calculations.totalNonMemberFeeToCollect += c.nonMemberFee
            c.otherFees = p.otherFees ?? 0
            this.calculations.totalOtherFeesToCollect += c.otherFees
        })

        // handle excess vehicle funds - distribute to vehicle providers
        let excessVehicleFunds = this.calculations.totalVehicleFeeToCollect - this.calculations.totalVehicleCost
        while (excessVehicleFunds > 0) {
            vehicleProviders.forEach(p => {
                if (excessVehicleFunds > 0) {
                    const c = this.calculations.participants[p.id]
                    const addExcess = Math.min(1, excessVehicleFunds)
                    c.vehicleExcess = (c.vehicleExcess ?? 0) + addExcess
                    excessVehicleFunds =- addExcess
                }
            })
        }

        // calculate total to pay/reimburse for each participant
        vehicleProviders.forEach(p => {
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
        const participants = [...this.props.currentParticipants]
        const index = participants.findIndex(p => p.id === id)
        const participant = { ...participants[index], ...data }

        participants[index] = participant

        this.props.setTripParticipants(participants, true)
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
        const onSet = (field: string, value: any): Promise<ITrip> => this.props.setTripFields({[field]: value}, false, false)
        const onSave = (field: string, value: any): Promise<ITrip> => this.props.setTripFields({[field]: value}, true, true)
        const onGetValidationMessage = (field: string): any => {
            return (validations.find(v => v.field === field && !v.ok) || {} as any).message
        }
        const onGetValidations = () => validations;

        // const onSetInverted = (field: string, value: any): Promise<ITrip> => this.props.setTripFields({[field]: !value}, true, true)

        const common = {
            id: 'trip',
            readOnly: trip.id !== -1 && !this.props.canEditTrip,
            owner: this,
            forceValidation: this.props.forceValidation,
             onGet, onSet, onSave, onGetValidationMessage
        }

        const vehicleProviders = currentParticipants.filter(p => p.isVehicleProvider);
        const others = currentParticipants.filter(p => !p.isVehicleProvider);

        return [
            <Container key='parameters-initial' fluid={true}>
                <Row>
                    <Col sm={5} md={4}>
                        <InputControl field='distanceOneWay' label='Distance one way (km)'
                            type='number' min={0} step={10} hidden={false} {...common} />
                    </Col>
                </Row>
            </Container>,

            <ListGroup key='costs-participants'>
                <ListGroupItem hidden={vehicleProviders.length >= 0}>
                    <div><b>No Vehicle Providers</b></div>
                </ListGroupItem>
                <ListGroupItem hidden={vehicleProviders.length === 0}>
                    <div><b>Vehicle Providers</b></div>
                    {
                        vehicleProviders.map(p => {
                            const pc = this.calculations.participants[p.id];
                            return <TripCostsParticipant key={`${p.id}${p.displayPriority}${p.isDeleted}`} 
                                participant={p}
                                participantCosts={pc}
                                canEdit = {this.props.canEditTrip || MembersService.Me.id === p.memberId}
                                onGetValidations={onGetValidations}
                                setParticipant={this.setParticipant}
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
                                setParticipant={this.setParticipant}
                            />
                        })
                    }
                </ListGroupItem>
            </ListGroup>,

            <Container key='parameters-continued' fluid={true}>
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
                            type='number' min={0} hidden={false} {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col sm={5} md={4}>
                        <InputControl field='totalVehicleFeeToCollect' label='Total vehicle fees to collect ($)'
                            placeholder={this.calculations.totalVehicleFeeToCollect}
                            type='number' min={0} hidden={false} {...common} readOnly={true} />
                    </Col>
                    <Col sm={5} md={4}>
                        <InputControl field='totalNonMemberFeeToCollect' label='Total non-member fees to collect ($)'
                            placeholder={this.calculations.totalNonMemberFeeToCollect}
                            type='number' min={0} hidden={false} {...common} readOnly={true} />
                    </Col>
                    <Col sm={5} md={4}>
                        <InputControl field='totalOtherFeesToCollect' label='Total other fees to collect ($)'
                            placeholder={this.calculations.totalOtherFeesToCollect}
                            type='number' min={0} hidden={false} {...common} readOnly={true} />
                    </Col>
                </Row>
            </Container>
        ]
    }
}
