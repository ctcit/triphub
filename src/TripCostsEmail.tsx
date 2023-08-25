import * as React from 'react';
import { Component } from 'react';
import { InputControl, SwitchesControl, TextAreaInputControl } from './Control';
import { IParticipant, IParticipantCosts, ITrip, IValidation } from './Interfaces';
import { BindMethods, GetFullDate, Mandatory } from './Utilities';
import { Col, FormGroup, Label, Button, Row, Container } from 'reactstrap';
import { Spinner } from './Widgets';
import { TripsService } from './Services/TripsService';
import memoizeOne from 'memoize-one';

export class TripCostsEmail extends Component<{
    trip: ITrip
    participants: IParticipant[],
    participantCosts: {[id: string]: IParticipantCosts}
}, {
    options?: string
    recipients?: string
    subject?: string
    bodyEnding?: string
    sending?: boolean
}>{
    private defaultOptions: string = 'have a balance to pay,have a balance to be reimbursed'
    private allOptions: string = 'have a balance to pay,have a balance to be reimbursed,have no balance to pay,have no balance to be reimbursed'

    private bodyEndingDefault: string = 
        'For those with a balance to pay, please make a bank deposit to the account number supplied by the leader.\n' +
        '\n' +
        'For those with a balance to be reimbursed, please supply your bank account number to the leader so that you can be reimbursed.\n' +
        '\n' +
        'NOTE: Please do not reply directly to this email as it will be ignored.  ' +
        'Instead, forward this email, adding your message, to the trip leader (email below).\n' + 
        '\n' +
        this.props.participants
            .filter(p => !p.isDeleted && p.isLeader)
            .map(p => p.name + ' (trip leader)\n' +
                (p.email.trim().length > 0 ? ('Email: ' + p.email + '\n') : '') +
                (p.phone.trim().length > 0 ? ('Phone: ' + p.phone + '\n') : '') +
                '\n')

    private memoizedUpdateRecipients = memoizeOne((participants: IParticipant[], participantCosts: {[id: string]: IParticipantCosts}) => {
        setTimeout(() => {
            this.setState({recipients: this.filterRecipients(this.state.options ?? '')})
        }, 0)
    });

    constructor(props: any) {
        super(props)

        this.state = {
            options: this.defaultOptions,
            recipients: '',
            subject: `Trip Costs for ${this.props.trip.title} on ${GetFullDate(this.props.trip.tripDate)}`,
            bodyEnding: this.bodyEndingDefault,
        }

        BindMethods(this)
    }

    public onSend() {
        this.setState({ sending: true })
        const promises = this.props.participants
            .filter(p => !p.isDeleted && this.filterByOption(p, this.state.options ?? '') && p.email.trim().length > 0)
            .map(p => {
                const email = {
                    recipients: p.email.trim(),
                    subject: this.state.subject,
                    body: this.getParticipantEmailText(p, this.props.participantCosts[p.id]) + this.state.bodyEnding
                }
                return TripsService.postTripBasicEmail(this.props.trip.id, email)
            })
        Promise.all(promises)
            .finally(() => this.setState({ sending: false }))
    }

    public render() {
        this.memoizedUpdateRecipients(this.props.participants, this.props.participantCosts)

        const { sending } = this.state;
        const validations: IValidation[] = Mandatory(this.state, ['subject', 'body']);
        const onGet = (field: string): any => (this.state as any)[field]
        const onSet = (field: string, value: any): void => this.setState({ [field]: value })
        const onSave = (field: string, value: any): Promise<any> => new Promise<any>((resolve) => {
                this.setState({ [field]: value }, () => resolve(value));
        })
        const onSaveOptions = (field: string, value: any): Promise<any> => new Promise<any>((resolve) => {
            const recipients = this.filterRecipients(value as string)
            this.setState({ [field]: value, recipients }, () => resolve(value)); 
        })

        const onGetValidationMessage = (id: string): any => {
            const found: IValidation | undefined = validations.find(v => v.field === id && !v.ok);
            return found ? found.message : null;
        }
        const onSend = () => this.onSend();

        const common = {
            id: 'trip-costs-email',
            onGet, onSet, onSave, onGetValidationMessage
        }
        const commonOptions = { ...common, 'onSave': onSaveOptions }


        return [
            <Container key='detail' fluid={true}>

                <Row>
                    <Col sm={6} md={6}>
                        <SwitchesControl field='options' label='Send to those who...'
                            options={this.allOptions}
                            {...commonOptions} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <InputControl type={'textarea'} key='recipients' field='recipients'
                        label='Recipients' readOnly={true} {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <InputControl key='subject' field='subject' label='Subject' type='text' {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <TextAreaInputControl key='bodyEnding' field='bodyEnding' label='Body ending' {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <FormGroup key='button'>
                            <Label />
                            <Col sm={10}>
                                <Button onClick={onSend}>
                                    {sending ? Spinner : <span className='fa fa-paper-plane' />}
                                    {sending ? 'Sending' : 'Send'}
                                </Button>
                                &nbsp;
                            </Col>
                        </FormGroup>
                    </Col>
                </Row>
            </Container>
        ]
    }

    private filterRecipients(options: string): string {
        // console.log('----------------')
        // console.log(options)
        return this.props.participants
            .filter(p => !p.isDeleted && this.filterByOption(p, options))
            .map(p => p.email.trim())
            .filter(e => e.length > 0)
            .join('; ')
    }

    private filterByOption(p: IParticipant, options: string): boolean {
        const pc: IParticipantCosts = this.props.participantCosts[p.id]
        const include: boolean = 
            ((pc.toPay ?? 0) - (pc.paid ?? 0) > 0 && options.includes('have a balance to pay')) ||
            ((pc.toPay ?? 0) - (pc.paid ?? 0) < 0 && options.includes('have a balance to be reimbursed')) ||
            ((pc.toPay ?? 0) - (pc.paid ?? 0) === 0 && (pc.toPay ?? 0) > 0 && options.includes('have no balance to pay')) ||
            ((pc.toPay ?? 0) - (pc.paid ?? 0) === 0 && (pc.toPay ?? 0) < 0 && options.includes('have no balance to be reimbursed'))
        // console.log(p.name + ', ' + p.email + ', ' + pc.toPay + ', ' + pc.paid + ', ' + include)
        return include
    }

    private getParticipantEmailText(participant: IParticipant, participantCosts: IParticipantCosts) {
        const text = 'Hi ' + participant.name + ',\n' +
            '\n' +
            'Regarding costs for this trip, ' + this.getPaymentStatusText(participantCosts) + '.\n' +
            '\n'
        return text
    }

    private getPaymentStatusText(participantCosts: IParticipantCosts) {
        let paymentStatusText = 'you have nothing to pay'
        if ((participantCosts.paid ?? 0) !== 0) {
            if ((participantCosts.paid ?? 0) > 0) {
                paymentStatusText = 'you have paid $' + participantCosts.paid
            } else if ((participantCosts.paid ?? 0) < 0) {
                paymentStatusText = 'you have been reimbursed $' + -(participantCosts.paid ?? 0)
            }
            const extraToPay = (participantCosts.toPay ?? 0) - (participantCosts.paid ?? 0)
            if (extraToPay !== 0) {
                if ((participantCosts.toPay ?? 0) > 0) {
                    paymentStatusText += ' of a total cost of $' + participantCosts.toPay
                } else if ((participantCosts.toPay ?? 0) < 0) {
                    paymentStatusText += ' of a total reimbursement of $' + -(participantCosts.toPay ?? 0)
                }
                if (extraToPay > 0) {
                    paymentStatusText += '; your balance to pay is $' + extraToPay
                } else if (extraToPay < 0) {
                    paymentStatusText += '; your balance to be reimbursed is $' + -extraToPay
                }
            } else {
                paymentStatusText += ' and have no remaining balance'
            }
        } else if ((participantCosts.toPay ?? 0) !== 0) {
            if ((participantCosts.toPay ?? 0) > 0) {
                paymentStatusText = 'your balance to pay is $' + participantCosts.toPay
            } else if ((participantCosts.toPay ?? 0) < 0) {
                paymentStatusText = 'your balance to be reimbursed is $' + -(participantCosts.toPay ?? 0)
            }
        }
        return paymentStatusText
    }
}
