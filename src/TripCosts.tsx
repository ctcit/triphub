import { ListGroup, ListGroupItem, Container, Row, Col, Form, Button, Navbar, FormText } from 'reactstrap';
import { Component } from 'react';
import { IDestination, IMileageRate, IParticipant, ITrip, ITripCostCalculations, IValidation } from './Interfaces';
import { BindMethods } from './Utilities';
import { InputControl, InputWithSelectControl } from './Control';
import { TripCostsParticipant } from './TripCostsParticipant';
import { MembersService } from './Services/MembersService';
import { TripsService } from './Services/TripsService';
import { Accordian } from './Accordian';
import { DestinationsService } from './Services/DestinationsService'
import { MdInfo } from 'react-icons/md';
import { MileageRatesService } from './Services/MileageRatesService';
import { ToolTipIcon } from './ToolTipIcon';
import { TripCostsEmail } from './TripCostsEmail';

export class TripCosts extends Component<{
    trip: ITrip
    participants: IParticipant[]
    currentParticipants: IParticipant[]
    canEditTrip: boolean
    setTripFields: (fields: any, setEdited: boolean, save: boolean) => Promise<any>
    setTripParticipants: (participants: IParticipant[], setEdited: boolean) => void
    forceValidation?: boolean
}, {
    showLegend: boolean,
    destinationsByGroups: {[area: string]: {[to: string]: {[from: string]: number}}},
    mileageRates: IMileageRate[]
}> {
    public calculations: ITripCostCalculations = {
        distanceOneWay: 0,
        participantsCount: 0,
        totalVehicleCost: 0,
        fixedCostVehicleCount: 0,
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
        this.state = {
            showLegend: false,
            destinationsByGroups: {},
            mileageRates: []
        }

        BindMethods(this)

        DestinationsService.getByGroups().then(destinationsByGroups => {
            this.setState({ destinationsByGroups })
        })
        MileageRatesService.getMileageRates().then(mileageRates => {
            this.setState({ mileageRates })
        })
    }

    public calculateCosts(): void {
        const trip: ITrip = this.props.trip

        trip.distanceOneWay = trip.distanceOneWay === undefined ? 0 : trip.distanceOneWay
        trip.totalVehicleCost = trip.totalVehicleCost === undefined ? null : trip.totalVehicleCost
        trip.payingParticipantsCount = trip.payingParticipantsCount === undefined ? null : trip.payingParticipantsCount
        trip.vehicleFee = trip.vehicleFee === undefined ? null : trip.vehicleFee

        const currentParticipants: IParticipant[] = this.props.currentParticipants

        this.calculations = {
            distanceOneWay: trip.distanceOneWay,
            participantsCount: currentParticipants.length,
            totalVehicleCost: 0,
            fixedCostVehicleCount: 0,
            payingParticipantsCount: 0, // number of those paying vehicle fee
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
                broughtVehicle: p.isVehicleProvider && p.broughtVehicle,
                isFixedCostVehicle: p.isFixedCostVehicle,
                totalDistance: p.totalDistance ?? null,
                ratePerKm: p.ratePerKm ?? null,
                vehicleCost: !p.isFixedCostVehicle ? null : p.vehicleCost ?? null,
                vehicleReimbursement: p.vehicleReimbursement ?? null, // vehicle cost less vehicle fee,
                adjustedVehicleReimbursement: p.adjustedVehicleReimbursement ?? null,
            
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
                c.ratePerKm = c.ratePerKm != null ? c.ratePerKm : this.ratePerKm(p.engineSize ?? 0)
                c.vehicleCost = c.vehicleCost != null ? c.vehicleCost : Math.ceil(c.totalDistance * c.ratePerKm / 2) // NOTE: ratePerKm is per ONE-WAY-km, so is twice the rate per total return km
                this.calculations.totalVehicleCost += c.vehicleCost
            })
        if (trip.totalVehicleCost !== null) {
            this.calculations.totalVehicleCost = trip.totalVehicleCost
        }

        // handle fixed cost vehicles
        this.calculations.fixedCostVehicleCount = actualVehicleProviders.filter(p => p.isFixedCostVehicle).length
        this.calculations.payingParticipantsCount = trip.payingParticipantsCount === null ?
            this.calculations.participantsCount - this.calculations.fixedCostVehicleCount : 
            trip.payingParticipantsCount

        // adjustments for participants that have overriding vehicle fee specified
        let overriddenVehicleFeeTotal = 0
        let overriddenVehicleFeeCount = 0
        currentParticipants.forEach(p => {
            const c = this.calculations.participants[p.id]
            if (c.vehicleFee != null) {
                overriddenVehicleFeeTotal += c.vehicleFee
                overriddenVehicleFeeCount++
            }
        })

        // calculate vehicle fee per paying participant
        const adjustedPayingParticipantsCount = this.calculations.payingParticipantsCount - overriddenVehicleFeeCount
        const adjustedTotalVehicleCost = Math.max(0, this.calculations.totalVehicleCost - overriddenVehicleFeeTotal)
        this.calculations.calculatedVehicleFee = adjustedPayingParticipantsCount > 0 ? 
            adjustedTotalVehicleCost / adjustedPayingParticipantsCount : 0
        this.calculations.roundedCalculatedVehicleFee = Math.ceil(this.calculations.calculatedVehicleFee)
        this.calculations.vehicleFee = trip.vehicleFee !== null ? trip.vehicleFee : this.calculations.roundedCalculatedVehicleFee

        // calculate fees for all participants
        let totalNonFixedCostVehicleFeesToCollect = 0
        currentParticipants.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.vehicleFee = c.vehicleFee != null ? c.vehicleFee : // manually overridden fee
                c.isFixedCostVehicle ? 0 : // fixed cost vehicle - no fee
                this.calculations.vehicleFee // otherwise, calculated fee
            const vehicleFeeToCollect = !c.broughtVehicle ? c.vehicleFee : 0
            this.calculations.totalVehicleFeeToCollect += vehicleFeeToCollect
            totalNonFixedCostVehicleFeesToCollect += c.isFixedCostVehicle ? 0 : vehicleFeeToCollect
            c.nonMemberFee = c.nonMemberFee != null ? c.nonMemberFee : !p.memberId ? this.nonMemberFee() : 0
            this.calculations.totalNonMemberFeeToCollect += c.nonMemberFee
            c.otherFees = c.otherFees ?? 0
            this.calculations.totalOtherFeesToCollect += c.otherFees
        })

        // calculate vehicle reimbursements
        let totalReimbursements = 0
        let totalNonFixedCostVehicleReimbursements = 0
        actualVehicleProviders.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.vehicleReimbursement = (c.vehicleCost ?? 0) - (c.vehicleFee ?? 0)
            totalReimbursements += c.vehicleReimbursement
            c.adjustedVehicleReimbursement = c.vehicleReimbursement
            totalNonFixedCostVehicleReimbursements += c.isFixedCostVehicle ? 0 : c.vehicleReimbursement
        })

        // handle excess or deficient vehicle funds; e.g. due to rounding and/or maunally overriden vehicle fees;
        if (actualVehicleProviders.length > 0) {
            const nonFixedCostVehiclesCount = actualVehicleProviders.length - this.calculations.fixedCostVehicleCount

            let deficientVehicleFunds = totalReimbursements - this.calculations.totalVehicleFeeToCollect
            if (deficientVehicleFunds > 0) {

                // deficient funds proportionally reduce non-fixed cost reimbursement (unless none, in which case reduce fixed cost reimbursements)
                const subtractFactor = totalNonFixedCostVehicleReimbursements === 0 ?
                    1.0 - this.calculations.totalVehicleFeeToCollect / totalReimbursements :  // reduce fixed costs
                    1.0 - totalNonFixedCostVehicleFeesToCollect / totalNonFixedCostVehicleReimbursements    // reduce only non-fixed cost

                actualVehicleProviders.forEach(p => {
                    if (deficientVehicleFunds > 0 && (!p.isFixedCostVehicle || nonFixedCostVehiclesCount === 0)) {
                        const c = this.calculations.participants[p.id]
                        const subtractDeficit = Math.ceil((c.adjustedVehicleReimbursement ?? 0) * subtractFactor)
                        c.adjustedVehicleReimbursement = (c.adjustedVehicleReimbursement ?? 0) - subtractDeficit
                        deficientVehicleFunds += subtractDeficit
                        totalReimbursements -= subtractDeficit
                    }
                })
            }

            // excess funds distributed too non-fixed cost reimbursement (unless none, in which case to fixed cost reimbursements)
            let excessVehicleFunds = this.calculations.totalVehicleFeeToCollect - totalReimbursements
            while (excessVehicleFunds > 0) {
                actualVehicleProviders.forEach(p => {
                    if (excessVehicleFunds > 0 && (!p.isFixedCostVehicle || nonFixedCostVehiclesCount === 0)) {
                        const c = this.calculations.participants[p.id]
                        const addExcess = Math.min(1, excessVehicleFunds)
                        c.adjustedVehicleReimbursement = (c.adjustedVehicleReimbursement ?? 0) + addExcess
                        excessVehicleFunds -= addExcess
                    }
                })
            }
        }

        // calculate total to pay/reimburse for each participant
        actualVehicleProviders.forEach(p => {
            const c = this.calculations.participants[p.id]
            c.toPay =  (c.nonMemberFee ?? 0) + (c.otherFees ?? 0) - (c.adjustedVehicleReimbursement ?? 0)
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
        // Note: These are the $/(ONE-WAY)km
        engineSizeCC = engineSizeCC ?? 0
        const rate = this.state.mileageRates.find(mileageRate => engineSizeCC <= mileageRate.engineSizeCC)?.ratePerOneWayKm ?? 0.0
        return rate
    }

    public nonMemberFee(): number {
        return 5.0;
    }

    public setParticipant(id: number, data: { [id: string]: any }, save: boolean): Promise<void> {
        return new Promise<void>((resolve) => {
            const participants = [...this.props.participants]
            const index = participants.findIndex(p => p.id === id)
            const participant = { ...participants[index], ...data }
    
            participants[index] = participant
            
            // clear any fixed vehicle cost if not fixed cost vehicle
            if (!participant.isFixedCostVehicle) { 
                participant.vehicleCost = null;
            }
    
            this.props.setTripParticipants(participants, true)
    
            if (save) {
                return TripsService.postTripParticipantUpdate(this.props.trip.id, id, data).finally(() => resolve())
            } else {
                resolve()
            }
        })
    }
    
    public onToggleLegend() {
        this.setState({ showLegend: !this.state.showLegend })
    }
    
    public render() {
        const trip: ITrip = this.props.trip
        const validations: IValidation[] = TripsService.validateCosts(this.props.trip)
        const warnings = validations.filter(i => !i.ok)
        const currentParticipants = this.props.currentParticipants

        this.calculateCosts();

        const LegendIcon = (props: { icon: string, children: any }) =>
            <div>&nbsp;<span className={`fas ${props.icon}`} />&nbsp;&nbsp;{props.children}</div>
        const LegendButton = (props: { icon: string, children: any }) =>
            <div><Button disabled={true}><span className={`fa ${props.icon}`} /></Button>&nbsp;{props.children}</div>
        const onToggleLegend = () => this.onToggleLegend();

        const onGet = (field: string): any => (this.props.trip as any)[field]
        const onSet = (field: string, value: any): Promise<ITrip> => 
            this.props.setTripFields({[field]: this.sanitizeNumber(value)}, false, false)
        const onSave = (field: string, value: any): Promise<ITrip> => 
            this.props.setTripFields({[field]: this.sanitizeNumber(value)}, true, true)
        const onGetValidationMessage = (field: string): any => {
            return (validations.find(v => v.field === field && !v.ok) || {} as any).message
        }
        const onGetValidations = () => validations;
        const setParticipant = (id: number, data: { [id: string]: any }, save: boolean) => this.setParticipant(id, data, save)
        
        const overriddenClassName = (field: string): string => onGet(field) === null ? 'input-control' : 'overridden-input-control'

        // const onSetInverted = (field: string, value: any): Promise<ITrip> => this.props.setTripFields({[field]: !value}, true, true)
        const title = [
            <span key='title'>More Details</span>,
            warnings.length &&
            <ToolTipIcon key='cost-warning' icon='warning' tooltip={warnings.map(v => v.message).join(', ')} className='warning-icon' id='costs-warning'/>,
        ].filter(e => e)

        const common = {
            id: 'trip',
            readOnly: trip.id !== -1 && !this.props.canEditTrip,
             onGet, onSet, onSave, onGetValidationMessage
        }

        const actualVehicleProviders = currentParticipants.filter(p => this.calculations.participants[p.id].broughtVehicle);
        const others = currentParticipants.filter(p => !this.calculations.participants[p.id].broughtVehicle);

        const groupedCommonDistances = Object.entries(this.state.destinationsByGroups).map(([area, toValues]) => {
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
                <Navbar key='navbar' color='light' light={true} expand='md'>
                {[
                        <a key='legend' href="https://youtu.be/ap8kTN5ekEg" target="_blank">
                            <MdInfo size="36" color="#6899e4" style={{padding: '7px'}}/>
                            <FormText color='muted'>Cost Calculator Tutorial</FormText>
                        </a>,
                        <Button key={'help'} onClick={onToggleLegend}>
                        <span className='fa fa-question-circle' />{this.state.showLegend ? 'Hide legend' : 'Show legend'}
                        </Button>
                ]}
                </Navbar>
                {this.state.showLegend ? <div className='participant-buttons-legend'>
                    <LegendIcon icon='fa-star'>This person is the leader</LegendIcon>
                    <LegendIcon icon='fa-car'>This person can bring a car</LegendIcon>
                    <LegendIcon icon='fa-id-badge'>This person is not a member of the CTC</LegendIcon>
                    <LegendButton icon='fa-car'>Click if participant did not bring vehicle</LegendButton>
                    <LegendButton icon='fa-taxi'>Click if participant brought vehicle</LegendButton>
                    <LegendButton icon='fa-balance-scale fa-sm'>Click if participant has paid or been reimbursed</LegendButton>
                    <LegendButton icon='fa-scale-unbalanced-flip fa-sm'>Click if participant has not paid, nor been reimbursed</LegendButton>
                </div> : null
                }
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
                    title={<span><span key='icon' className='fa fa-ellipsis fa-fw' />{title}</span>}>
                    <Form key='form' className='indentedparticipants form'>
                        <Container fluid={true}>
                            <Row>
                                <Col sm={5} md={3}>
                                    <InputControl field='participantsCount' label='Total number of people on the trip'
                                        placeholder={this.calculations.participantsCount}
                                        type='number' min={0} hidden={false} {...common} readOnly={true} />
                                </Col>
                                <Col sm={5} md={3}>
                                    <InputControl field='fixedCostVehicleCount' label='Total number of fixed cost vehicles'
                                        placeholder={this.calculations.fixedCostVehicleCount}
                                        type='number' min={0} hidden={false} {...common} readOnly={true} />
                                </Col>
                                <Col sm={5} md={3}>
                                    <InputControl field='payingParticipantsCount' label='Number to pay vehicle costs'
                                        helpText={'Number on trip, less number of fixed cost vehicle drivers'}
                                        placeholder={this.calculations.payingParticipantsCount}
                                        className={overriddenClassName('payingParticipantsCount')}
                                        type='number' min={0} hidden={false} {...common} />
                                </Col>
                            </Row>
                            <Row>
                                <Col sm={5} md={3}>
                                    <InputControl field='totalVehicleCost' label='Total vehicle costs ($)'
                                        placeholder={this.calculations.totalVehicleCost}
                                        className={overriddenClassName('totalVehicleCost')}
                                        type='number' min={0} hidden={false} {...common} />
                                </Col>
                                {/* <Col sm={5} md={3}>
                                    <InputControl field='calculatedVehicleFee' label='Costs per person ($)'
                                        placeholder={this.calculations.calculatedVehicleFee}
                                        type='number' min={0} hidden={false} {...common} readOnly={true} />
                                </Col> */}
                                <Col sm={5} md={3}>
                                    <InputControl field='roundedCalculatedVehicleFee' label='Costs per person rounded up ($)'
                                        placeholder={this.calculations.roundedCalculatedVehicleFee}
                                        type='number' min={0} hidden={false} {...common} readOnly={true} />
                                </Col>
                                <Col sm={5} md={3}>
                                    <InputControl field='vehicleFee' label='Vehicle fee ($)'
                                        helpText={'Applies to all participants except fixed-cost-vehicle drivers'}
                                        placeholder={this.calculations.vehicleFee}
                                        className={overriddenClassName('vehicleFee')}
                                        type='number' min={0} hidden={false} {...common} />
                                </Col>
                            </Row>
                        </Container>
                    </Form>
                </Accordian>

                <Row>
                    <Col sm={5} md={3}>
                        <InputControl field='totalVehicleFeeToCollect' label='Total vehicle fees ($) to collect'
                            helpText={'Collected from non-drivers, and paid to drivers'}
                            placeholder={this.calculations.totalVehicleFeeToCollect}
                            type='number' min={0} hidden={false} {...common} readOnly={true} />
                    </Col>
                    <Col sm={5} md={3}>
                        <InputControl field='totalNonMemberFeeToCollect' label='Total non-member ($) fees to collect'
                            helpText={'Pay to the CTC treasurer or bank account'}
                            placeholder={this.calculations.totalNonMemberFeeToCollect}
                            type='number' min={0} hidden={false} {...common} readOnly={true} />
                    </Col>
                    <Col sm={5} md={3}>
                        <InputControl field='totalOtherFeesToCollect' label='Total other fees ($) to collect'
                            helpText={'e.g. hut or gear fees'}
                            placeholder={this.calculations.totalOtherFeesToCollect}
                            type='number' min={0} hidden={false} {...common} readOnly={true} />
                    </Col>
                </Row>

            </Container>,

            <ListGroup key='costs-participants'>
                <ListGroupItem key='vehicle-providers'>
                    <div><b>Vehicle Providers</b></div>
                    {actualVehicleProviders.length === 0 &&
                        <FormText color="muted">No vehicle providers</FormText>
                    }
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
                <ListGroupItem key='others'>
                    <div><b>Others</b></div>
                    {others.length === 0 &&
                        <FormText color="muted">No others</FormText>
                    }
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

            <div key='email-costs-div'>
                {!this.props.canEditTrip ? null :
                    <Container key='email-costs-container' fluid={true}>
                        <Accordian id={'email'} className='email-section'
                            headerClassName='email-header' expanded={false}
                            title={<span><span key='icon' className='fa fa-paper-plane fa-fw' />Email Costs</span>}>
                            <Form key='form' className='indentedparticipants form'>
                                <TripCostsEmail trip={trip} participants={currentParticipants} participantCosts={this.calculations.participants} />
                            </Form>
                        </Accordian>
                    </Container>
                }
            </div>
        ]
    }

    private sanitizeNumber(value: number): number | null {
        return isNaN(value) ? null : value
    }
}
