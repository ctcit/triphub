import { Form, Row, Col, Container, ButtonGroup, Spinner } from 'reactstrap'
import { Component } from 'react'
import { IParticipant, IParticipantCosts, IValidation } from './Interfaces'
import { InputControl, InputWithSelectControl, SwitchControl } from './Control'
import { ToolTipIcon } from './ToolTipIcon'
import { Accordian } from './Accordian'
import { BindMethods } from './Utilities'
import { ButtonWithTooltip } from './ButtonWithTooltip'
import { ConfigService } from './Services/ConfigService'
import { TripsService } from './Services/TripsService'

export class TripCostsParticipant extends Component<{
    participant: IParticipant,
    participantCosts: IParticipantCosts,
    canEdit: boolean,
    onGetValidations: (participant: IParticipant) => IValidation[]
    setParticipant(id: number, data: { [id: string]: any }, save: boolean): Promise<void>
}, {
    isUpdateOp?: boolean
}> {
    constructor(props: any) {
        super(props)

        this.state = {}
        
        BindMethods(this)
    }

    public render() {
        const participant = this.props.participant
        const participantCosts = this.props.participantCosts
        const canEdit = this.props.canEdit
        const validations: IValidation[] = TripsService.validateParticipant(participant, [participant])
        const warnings = validations.filter(i => !i.ok)

        const onGet = (field: string): any => participant[field]
        const onSet = (field: string, value: any): Promise<void> => 
            this.props.setParticipant(participant.id, { [field]: this.sanitizeNumber(value) }, false)
        const onSave = (field: string, value: any): Promise<void> => 
            this.props.setParticipant(participant.id, { [field]: this.sanitizeNumber(value) }, true)

        const onGetValidationMessage = (field: string): any => {
            return (validations.find(v => v.field === field && !v.ok) || {} as any).message
        }

        const overriddenClassName = (field: string): string => onGet(field) === null ? 'input-control' : 'overridden-input-control'

        const onSaveIsFixedCostVehicle = (field: string, value: any): Promise<void> => {
            const vehicleCost = value ? participant.vehicleCost : null
            return onSave('vehicleCost', vehicleCost).then(() => onSave(field, value))
        }

        const common = {
            id: `${participant.id}`,
            readOnly: !canEdit,
            onGet,
            onSet,
            onSave,
            onGetValidationMessage
        }

        const onToggleBroughtVehicle = () => {
            onSave('broughtVehicle', !participantCosts.broughtVehicle)
        }
        const onPaidReimbursed = () => {
            onSave('paid', participantCosts.toPay)
        }
        const onNotPaidReimbursed = () => {
            onSave('paid', 0)
        }

        // 
        const onNegativeNumberGet = (field: string): any => this.sanitizeNegativeNumber(participant[field])
        const onNegativeNumberSet = (field: string, value: any): Promise<void> => 
            this.props.setParticipant(participant.id, { [field]: this.sanitizeNegativeNumber(value) }, false)
        const onNegativeNumberSave = (field: string, value: any): Promise<void> => 
            this.props.setParticipant(participant.id, { [field]: this.sanitizeNegativeNumber(value) }, true)

        const iconid = `${participant.id || 'new'}`
        const title = [
            <span key='title'>{participant.name} </span>,
            warnings.length &&
            <ToolTipIcon key='cost-warning' icon='warning' tooltip={warnings.map(v => v.message).join(', ')} className='warning-icon' id={iconid} />,
            participant.isLeader &&
            <ToolTipIcon key='cost-leader' icon='star' tooltip={`${participant.name} is the leader`} id={iconid} />,
            participant.isVehicleProvider &&
            <ToolTipIcon key='cost-car' icon='car' tooltip={`${participant.name} can bring a car`} id={iconid} />,
            !participant.memberId &&
            <ToolTipIcon key='cost-nonmember' icon='id-badge' tooltip={`${participant.name} is not a member of the CTC`} id={iconid} />,
        ].filter(e => e)

        let paymentStatusText = 'Nothing to pay'
        let paymentStatusStyle = {color: 'black', fontWeight: 'normal' as 'normal' | 'bold'}
        if ((participantCosts.paid ?? 0) !== 0) {
            if ((participantCosts.paid ?? 0) > 0) {
                paymentStatusText = 'Paid: $' + participantCosts.paid
            } else if ((participantCosts.paid ?? 0) < 0) {
                paymentStatusText = 'Reimbursed: $' + -(participantCosts.paid ?? 0)
            }
            const extraToPay = (participantCosts.toPay ?? 0) - (participantCosts.paid ?? 0)
            if (extraToPay > 0) {
                paymentStatusText += '; Remainder to pay: $' + extraToPay
                paymentStatusStyle = {color: 'orange', fontWeight: 'bold'}
            } else if (extraToPay < 0) {
                paymentStatusText += '; Remainder to be reimbursed: $' + -extraToPay
                paymentStatusStyle = {color: 'orange', fontWeight: 'bold'}
            }
        } else if ((participantCosts.toPay ?? 0) !== 0) {
            if ((participantCosts.toPay ?? 0) > 0) {
                paymentStatusText = 'To pay: $' + participantCosts.toPay
                paymentStatusStyle = {color: 'red', fontWeight: 'bold'}
            } else if ((participantCosts.toPay ?? 0) < 0) {
                paymentStatusText = 'To be reimbursed: $' + -(participantCosts.toPay ?? 0)
                paymentStatusStyle = {color: 'red', fontWeight: 'bold'}
            }
        }
        const paymentStatus = <span className='payment-status' key='payment-status' 
            style={paymentStatusStyle}>{paymentStatusText}</span>

        const buttons = [
            participant.isVehicleProvider && !participantCosts.broughtVehicle &&
            <ButtonWithTooltip key='broughtVehicle' id={'broughtVehicle' + participant.id} onClick={onToggleBroughtVehicle} tooltipText="Click if partcipant brought vehicle">
                <>
                    <span className='fa fa-taxi' />
                    {this.state.isUpdateOp ? ['Updating ', Spinner] : ''}
                </>
            </ButtonWithTooltip>,
            participantCosts.broughtVehicle &&
            <ButtonWithTooltip key='notBroughtVehicle' id={'notBroughtVehicle' + participant.id} onClick={onToggleBroughtVehicle} tooltipText="Click if participant did not bring vehicle">
                <>
                    <span className='fa fa-car'/>
                    {this.state.isUpdateOp ? ['Updating ', Spinner] : ''}
                </>
            </ButtonWithTooltip>,
            participantCosts.toPay !== participantCosts.paid &&
            <ButtonWithTooltip key='paidReimbursed' id={'paidReimbursed' + participant.id} onClick={onPaidReimbursed} tooltipText="Click if participant has paid or been reimbursed">
                <>
                    <span className='fa fa-sm fa-balance-scale' />
                    {this.state.isUpdateOp ? ['Updating ', Spinner] : ''}
                </>
            </ButtonWithTooltip>,
            participantCosts.toPay === participantCosts.paid &&
            <ButtonWithTooltip key='notPaidReimbursed' id={'notPaidReimbursed' + participant.id} onClick={onNotPaidReimbursed} tooltipText="Click if participant has not paid, nor been reimbursed">
                <>
                    <span className='fa fa-sm fa-scale-unbalanced-flip' />
                    {this.state.isUpdateOp ? ['Updating ', Spinner] : ''}
                </>
            </ButtonWithTooltip>,
        ].filter(e => e)
        const buttonGroup = <ButtonGroup className='participant-buttons'>{buttons}</ButtonGroup>

        return (
            <div>

                <Accordian id={`${participant.id}`} className='participant'
                    headerClassName='participant-header' expanded={participant.id === -1}
                    title={<span>{title}{buttonGroup}{paymentStatus}</span>}>
                    <Form key='form' className='indentedparticipants form'>
                        <Container key='container' className={ConfigService.containerClassName} fluid={true}>
                            {
                                participantCosts.broughtVehicle &&
                                <Row>
                                    <Col sm={2} md={3}>
                                        <SwitchControl field='isFixedCostVehicle' label='Fixed cost vehicle (e.g. company)' 
                                            {...common} onSave={onSaveIsFixedCostVehicle}
                                        />
                                    </Col>
                                </Row>
                            }
                            {
                                participantCosts.broughtVehicle && !participant.isFixedCostVehicle &&
                                <Row>
                                    <Col sm={3}>
                                        <InputWithSelectControl field='engineSize' label='Engine Size (cc), EV=0' 
                                        type="number" min={0} max={10000} step={100}
                                        options={[0,1300,1500,1600,1800,2000,2500,3000]} {...common} />
                                    </Col>
                                    <Col sm={3}>
                                        <InputControl field='ratePerKm' label='Rate ($/ONE-WAY-km)' 
                                        placeholder={participantCosts.ratePerKm}
                                        className={overriddenClassName('ratePerKm')}
                                        type='number' {...common} />
                                    </Col>
                                    <Col sm={3}>
                                        <InputControl field='totalDistance' label='Total Return Distance (km)' 
                                        placeholder={participantCosts.totalDistance}
                                        className={overriddenClassName('totalDistance')}
                                        type='number' {...common} />
                                    </Col>
                                </Row>
                            }
                            {
                                participantCosts.broughtVehicle && !participant.isFixedCostVehicle &&
                                <Row>
                                    <Col sm={3}>
                                        <InputControl field='vehicleCost' label='Vehicle Cost ($)' 
                                        placeholder={participantCosts.vehicleCost}
                                        type='number' {...common} readOnly={true}/>
                                    </Col>
                                    <Col sm={3}>
                                        <InputControl field='vehicleFee' label='Vehicle Fee ($)' 
                                        placeholder={participantCosts.vehicleFee}
                                        className={overriddenClassName('vehicleFee')}
                                        type='number' {...common} />
                                    </Col>
                                    <Col sm={3}>
                                        <InputControl field='vehicleReimbursement' label='Vehicle Reimbursement ($)' 
                                        placeholder={participantCosts.vehicleReimbursement}
                                        type='number' {...common} readOnly={true} />
                                    </Col>
                                    <Col sm={3}>
                                        <InputControl field='adjustedVehicleReimbursement' label='Adjusted Vehicle Reimbursement ($)' 
                                        helpText={'Adjusted to balance with collected vehicle fees'}
                                        placeholder={participantCosts.adjustedVehicleReimbursement}
                                        type='number' {...common} readOnly={true} />
                                    </Col>
                                </Row>
                            }
                            {
                                participantCosts.broughtVehicle && participant.isFixedCostVehicle &&
                                <Row>
                                    <Col sm={3}>
                                        <InputControl field='vehicleCost' label='Vehicle Cost ($)' 
                                        placeholder={participantCosts.vehicleCost}
                                        type='number' {...common} />
                                    </Col>
                                    <Col sm={3}>
                                        <InputControl field='vehicleReimbursement' label='Vehicle Reimbursement ($)' 
                                        placeholder={participantCosts.vehicleReimbursement}
                                        type='number' {...common} readOnly={true} />
                                    </Col>
                                    <Col sm={3}>
                                        <InputControl field='adjustedVehicleReimbursement' label='Adjusted Vehicle Reimbursement ($)' 
                                        helpText={'Adjusted to balance with collected vehicle fees'}
                                        placeholder={participantCosts.adjustedVehicleReimbursement} 
                                        type='number' {...common} readOnly={true} />
                                    </Col>
                                </Row>
                            }
                            <Row>
                                {
                                !participantCosts.broughtVehicle &&
                                    <Col sm={3}>
                                        <InputControl field='vehicleFee' label='Vehicle Fee ($)' 
                                        placeholder={participantCosts.vehicleFee}
                                        className={overriddenClassName('vehicleFee')}
                                        type='number' {...common} />
                                    </Col>
                                }
                                <Col sm={3}>
                                    <InputControl field='nonMemberFee' label='Non-Member Fee ($)' 
                                    placeholder={participantCosts.nonMemberFee}
                                    className={overriddenClassName('nonMemberFee')}
                                    type='number' {...common} />
                                </Col>
                                <Col sm={3}>
                                    <InputControl field='otherFees' label='Other Fees ($)' 
                                    helpText={'e.g. hut or gear fees'}
                                    placeholder={participantCosts.otherFees}
                                    className={overriddenClassName('otherFees')}
                                    type='number' {...common} />
                                </Col>
                            </Row>
                            <Row key='3'>
                                {
                                (participantCosts.toPay ?? 0) >= 0 ? 
                                    <Col sm={3}>
                                        <InputControl field='toPay' label='Total to pay ($)' 
                                        placeholder={participantCosts.toPay}
                                        type='number' {...common} readOnly={true} />
                                    </Col>
                                :
                                    <Col sm={3}>
                                        <InputControl field='toPay' label='Total to reimburse ($)' 
                                        placeholder={participantCosts.toPay !== null ? -participantCosts.toPay : null}
                                        type='number' 
                                        {...common} 
                                        readOnly={true} 
                                        onGet={onNegativeNumberGet}
                                        onSet={onNegativeNumberSet}
                                        onSave={onNegativeNumberSave}
                                        />
                                    </Col>
                                }
                                {(participantCosts.toPay ?? 0) >= 0 ? 
                                    <Col sm={3}>
                                        <InputControl field='paid' label='Total paid ($)' 
                                        placeholder={participantCosts.paid}
                                        type='number' {...common} />
                                    </Col>
                                :
                                    <Col sm={3}>
                                        <InputControl field='paid' label='Total reimbursed ($)' 
                                        placeholder={participantCosts.paid !== null ? -participantCosts.paid : null}
                                        type='number' 
                                        {...common} 
                                        onGet={onNegativeNumberGet}
                                        onSet={onNegativeNumberSet}
                                        onSave={onNegativeNumberSave}
                                        />
                                    </Col>
                                }   
                        </Row>

                        </Container>
                    </Form>
                </Accordian>
            </div>
        )
    }
    
    private sanitizeNumber(value: number): number | null {
        return isNaN(value) ? null : value
    }
    private sanitizeNegativeNumber(value: number): number | null {
        return isNaN(value) ? null : value ? -value: value
    }
}
