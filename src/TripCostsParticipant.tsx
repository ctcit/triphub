import * as React from 'react'
import { Form, Row, Col, Container, ButtonGroup, Spinner } from 'reactstrap'
import { Component } from 'react'
import { IParticipant, IParticipantCosts, ITrip, IValidation } from './Interfaces'
import { App } from './App'
import { InputControl } from './Control'
import { ToolTipIcon } from './ToolTipIcon'
import { Accordian } from './Accordian'
import { BindMethods } from './Utilities'
import { ButtonWithTooltip } from './ButtonWithTooltip'
import { ConfigService } from './Services/ConfigService'

export class TripCostsParticipant extends Component<{
    participant: IParticipant,
    participantCosts: IParticipantCosts,
    canEdit: boolean,
    onGetValidations: (participant: IParticipant) => IValidation[]
    setParticipant(id: number, data: { [id: string]: any }, save: boolean): Promise<IParticipant>
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
        const validations: IValidation[] = this.props.onGetValidations(participant);

        const onGet = (field: string): any => participant[field]
        const onSet = (field: string, value: any): Promise<IParticipant> => this.props.setParticipant(participant.id, { [field]: value }, false)
        const onSave = (field: string, value: any): Promise<IParticipant> => this.props.setParticipant(participant.id, { [field]: value }, true)

        const onGetValidationMessage = (field: string): any => {
            return (validations.find(v => v.field === field && !v.ok) || {} as any).message
        }

        const common = {
            id: `${participant.id}`,
            readOnly: !canEdit,
            onGet,
            onSet,
            onSave,
            onGetValidationMessage
        }

        const onPaidReimbursed = () => onSave('paid', participant.toPay)
        const onToggleBroughtVehicle = () => onSave('broughtVehicle', !participant.broughtVehicle)

        const iconid = `${participant.id || 'new'}`
        const title = [
            <span key='title'>{participant.name} </span>,
            validations.length &&
            <ToolTipIcon key='warning' icon='warning' tooltip={validations.map(v => v.message).join(', ')} className='warning-icon' id={iconid} />,
            participant.isLeader &&
            <ToolTipIcon key='leader' icon='star' tooltip={`${participant.name} is the leader`} id={iconid} />,
            participant.isVehicleProvider &&
            <ToolTipIcon key='car' icon='car' tooltip={`${participant.name} is bringing a Car`} id={iconid} />,
            !participant.memberId &&
            <ToolTipIcon key='nonmember' icon='id-badge' tooltip={`${participant.name} is not a member of the CTC`} id={iconid} />,
        ].filter(e => e)
        const buttons = [
            participant.isVehicleProvider && !participant.broughtVehicle &&
            <ButtonWithTooltip key='broughtVehicle' id={'broughtVehicle' + participant.id} onClick={onToggleBroughtVehicle} tooltipText="Click if partcipant brought vehicle">
                <span className='fa fa-sm fa-user' />
                {this.state.isUpdateOp ? ['Updating ', Spinner] : ''}
            </ButtonWithTooltip>,
            participant.broughtVehicle &&
            <ButtonWithTooltip key='notBroughtVehicle' id={'notBroughtVehicle' + participant.id} onClick={onToggleBroughtVehicle} tooltipText="Click if partcipant did not bring vehicle">
                <span className='fa fa-sm fa-user-shield' />
                {this.state.isUpdateOp ? ['Updating ', Spinner] : ''}
            </ButtonWithTooltip>,
            participant.toPay === participant.paid &&
            <ButtonWithTooltip key='paidReimbursed' id={'paidReimbursed' + participant.id} onClick={onPaidReimbursed} tooltipText="Click if participant has paid or been reimbursed">
                <span className='fa fa-sm fa-balance-scale' />
                {this.state.isUpdateOp ? ['Updating ', Spinner] : ''}
            </ButtonWithTooltip>,
        ].filter(e => e)
        const buttonGroup = <ButtonGroup className='participant-buttons'>{buttons}</ButtonGroup>

        return (
            <div>

                <Accordian id={`${participant.id}`} className='participant'
                    headerClassName='participant-header' expanded={participant.id === -1}
                    title={<span>{title}{buttonGroup}</span>}>
                    <Form key='form' className='indentedparticipants form'>
                        <Container key='container' className={ConfigService.containerClassName} fluid={true}>
                            {
                                !participant.isVehicleProvider ? null :
                                <Row>
                                    <Col sm={4}>
                                        <InputControl field='engineSize' label='Engine Size (cc), EV=0' type='number' {...common} />
                                    </Col>
                                    <Col sm={4}>
                                        <InputControl field='totalDistance' label='Total Return Distance (km)' type='number' {...common} />
                                    </Col>
                                    <Col sm={4}>
                                        <InputControl field='ratePerKm' label='Rate ($/km)' type='number' {...common} />
                                    </Col>
                                </Row>
                            }

                            <Row>
                                {
                                participant.isVehicleProvider ? null :
                                <Col sm={4}>
                                    <InputControl field='vehicleFee' label='Vehicle Fee ($)' type='number' {...common} />
                                </Col>
                                }
                                <Col sm={4}>
                                    <InputControl field='nonMemberFee' label='Non-Member Fee ($)' type='number' {...common} />
                                </Col>
                                <Col sm={4}>
                                    <InputControl field='otherFees' label='Other Fees ($); e.g. hut fees' type='number' {...common} />
                                </Col>
                            </Row>

                            <Row key='3'>
                                {participantCosts.toPay ?? 0 >= 0 ? 
                                    <Col sm={4}>
                                        <InputControl field='toPay' label='To pay ($)' type='number' {...common} />
                                    </Col>
                                :
                                    <Col sm={4}>
                                        <InputControl field='toPay' label='To reimburse ($)' type='number' {...common} />
                                    </Col>
                                }
                                {(participantCosts.paid ?? 0 >= 0) && (participantCosts.toPay ?? 0 >= 0) ? 
                                    <Col sm={4}>
                                        <InputControl field='paid' label='Paid ($)' type='number' {...common} />
                                    </Col>
                                :
                                    <Col sm={4}>
                                        <InputControl field='paid' label='Reimbursed ($)' type='number' {...common} />
                                    </Col>
                                }   
                        </Row>

                        </Container>
                    </Form>
                </Accordian>
            </div>
        )
    }
}
