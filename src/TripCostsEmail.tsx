import * as React from 'react';
import { Component } from 'react';
import { ControlWrapper, InputControl, SwitchesControl, TextAreaInputControl } from './Control';
import { IParticipant, IParticipantCosts, ITrip, IValidation } from './Interfaces';
import { BindMethods, GetFullDate, Mandatory } from './Utilities';
import { Col, FormGroup, Label, Button, Row, Container, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import { Spinner } from './Widgets';
import { TripsService } from './Services/TripsService';
import memoizeOne from 'memoize-one';
import classnames from 'classnames';
import { FaAngleLeft, FaAngleRight } from 'react-icons/fa';

export class TripCostsEmail extends Component<{
    trip: ITrip
    participants: IParticipant[],
    participantCosts: {[id: string]: IParticipantCosts}
}, {
    options: string
    recipients: IParticipant[]
    recipientNames: string
    subject: string
    bodyActiveTab: string,
    bodyTemplate: string
    bodyPreview: string
    bodyPreviewIndex: number
    sending: boolean
    sendingPreviewed: boolean
}>{
    private recipientNameTag = '{{recipient-name}}'
    private recipientBalanceStatusTag = '{{recipient-balance-status}}'
    private defaultOptions: string = 'have a balance to pay,have a balance to be reimbursed'
    private allOptions: string = 'have a balance to pay,have a balance to be reimbursed,have no balance to pay,have no balance to be reimbursed'

    private bodyTemplateDefault: string = 
        'Hi ' + this.recipientNameTag + ',\n' +
        '\n' +
        'Regarding costs for this trip, ' + this.recipientBalanceStatusTag + '.\n' +
        '\n' +
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
            this.setRecipients(this.state.options)
        }, 0)
    });

    constructor(props: any) {
        super(props)

        this.state = {
            options: this.defaultOptions,
            recipients: [],
            recipientNames: '',
            subject: `Trip Costs for ${this.props.trip.title} on ${GetFullDate(this.props.trip.tripDate)}`,
            bodyActiveTab: 'Template',

            bodyTemplate: this.bodyTemplateDefault,
            bodyPreview: '',
            bodyPreviewIndex: 0,
            sending: false,
            sendingPreviewed: false
        }

        BindMethods(this)
    }

    public onSend() {
        this.setState({ sending: true })
        const promises = this.state.recipients
            .map(p => this.sendEmail(p))
        Promise.all(promises)
            .finally(() => this.setState({ sending: false }))
    }

    public onSendPreviewedEmail() {
        this.setState({ sendingPreviewed: true })
        this.sendEmail(this.state.recipients[this.state.bodyPreviewIndex])
            .finally(() => this.setState({ sendingPreviewed: false }))
    }

    public sendEmail(participant: IParticipant): Promise<any> {
        console.log('sending email to ' + participant.name + ' <' + participant.email + '>')
        const email = {
            recipients: participant.email.trim(),
            subject: this.state.subject,
            body: this.getParticipantEmailText(participant, this.props.participantCosts[participant.id])
        }
        return TripsService.postTripBasicEmail(this.props.trip.id, email)
    }

    public render() {
        this.memoizedUpdateRecipients(this.props.participants, this.props.participantCosts)

        const { sending, sendingPreviewed } = this.state;
        
        const validations: IValidation[] = Mandatory(this.state, ['subject', 'body']);
        const participantsWithNoEmail = this.props.participants
            .filter(p => !p.isDeleted && this.filterByOption(p, this.state.options ?? '') && p.email.trim().length === 0)
            .map(p => p.name)
            .join("; ")
        validations.push({ 
            field: 'recipientNames', 
            ok: participantsWithNoEmail.length === 0, 
            message: `The following selected participants have no email address: ` + participantsWithNoEmail 
        })
        validations.push({ 
            field: 'bodyTemplate', 
            ok: this.state.bodyTemplate.indexOf(this.recipientNameTag) >= 0, 
            message: `The ` + this.recipientNameTag + ` tag is missing` 
        })
        validations.push({ 
            field: 'bodyTemplate', 
            ok: this.state.bodyTemplate.indexOf(this.recipientBalanceStatusTag) >= 0, 
            message: `The ` + this.recipientBalanceStatusTag + ` tag is missing` 
        })

        const onGet = (field: string): any => (this.state as any)[field]
        const onSet = (field: string, value: any): void => this.setState({ ...this.state, [field]: value })
        const onSave = (field: string, value: any): Promise<any> => new Promise<any>((resolve) => {
                this.setState({ [field]: value } as any, () => resolve(value));
        })
        const onSaveOptions = (field: string, value: any): Promise<any> => this.setRecipients(value as string)
        const onSaveBodyTemplate = (field: string, value: any): Promise<any> => new Promise<any>((resolve) => {
            const bodyPreview = this.getBodyPreviewText(this.state.bodyPreviewIndex)
            this.setState({ [field]: value, bodyPreview } as any, () => resolve(value)); 
        })

        const setTemplateTab = () => {
            setTab('Template', true);
        }
        const setPreviewTab = () => {
            setTab('Preview', true);
        }
        const setTab = (tab: string, showMap: boolean) => {
            if (this.state.bodyActiveTab !== tab) {
                this.setState({ bodyActiveTab: tab });
            }
        }

        const onGetValidationMessage = (id: string): any => {
            const found: IValidation | undefined = validations.find(v => v.field === id && !v.ok);
            return found ? found.message : null;
        }
        const onSendPreviewedEmail = () => this.onSendPreviewedEmail();
        const onSend = () => this.onSend();

        const common = {
            id: 'trip-costs-email',
            forceValidation: true,
            onGet, onSet, onSave, onGetValidationMessage
        }
        const commonOptions = { ...common, 'onSave': onSaveOptions }
        const commonBodyTemplate = { ...common, 'onSave' : onSaveBodyTemplate}

        const onPrevious = () => {
            const bodyPreviewIndex = (this.state.bodyPreviewIndex - 1) % this.state.recipients.length
            const bodyPreview = this.getBodyPreviewText(bodyPreviewIndex)
            this.setState({ bodyPreview, bodyPreviewIndex }); 
        }
        const onNext = () => {
            const bodyPreviewIndex = (this.state.bodyPreviewIndex + 1) % this.state.recipients.length
            const bodyPreview = this.getBodyPreviewText(bodyPreviewIndex)
            this.setState({ bodyPreview, bodyPreviewIndex }); 
        }
        const canPrevious = this.state.bodyPreviewIndex > 0
        const canNext = this.state.bodyPreviewIndex < this.state.recipients.length - 1


        return [
            <Container key='costsemail' fluid={true}>

                <Row>
                    <Col sm={6} md={6}>
                        <SwitchesControl field='options' label='Send to those who...'
                            options={this.allOptions}
                            {...commonOptions} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <TextAreaInputControl key='recipientNames' field='recipientNames'
                        label='Recipients' readOnly={true} style={{backgroundColor: '#EBEBE4'}} minRows={3} {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <InputControl key='subject' field='subject' label='Subject' type='text' {...common} />
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <ControlWrapper id='body' field='body' label='Body' 
                            onGetValidationMessage={onGetValidationMessage} saving={false}
                            >
                            <div style={{border: '1px solid', borderColor: 'lightGrey', borderRadius: '5px', padding: '5px'}}>
                            <Nav tabs={true}>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: this.state.bodyActiveTab === 'Template' })}
                                        onClick={setTemplateTab}
                                    >
                                        Template
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        className={classnames({ active: this.state.bodyActiveTab === 'Preview' })}
                                        onClick={setPreviewTab}
                                    >
                                        Preview
                                    </NavLink>
                                </NavItem>
                            </Nav>
                            <TabContent activeTab={this.state.bodyActiveTab}>
                                <TabPane tabId="Template">
                                    <TextAreaInputControl key='bodyTemplate' field='bodyTemplate' label='' minRows={18} {...commonBodyTemplate} />
                                </TabPane>
                                <TabPane tabId="Preview">
                                    <TextAreaInputControl key='bodyPreview' field='bodyPreview' label='' readOnly={true} style={{backgroundColor: '#EBEBE4'}} minRows={15} {...common} />
                                    <Row>
                                        <Col sm={3} md={3}>
                                            <Button onClick={onPrevious} disabled={!canPrevious}>
                                                <FaAngleLeft/>
                                            </Button>&nbsp;
                                            <Button onClick={onNext} disabled={!canNext}>
                                                <FaAngleRight/>
                                            </Button>
                                        </Col>
                                        {this.state.recipients.length > 0 &&
                                            <Col>
                                                <Button onClick={onSendPreviewedEmail}>
                                                    {sendingPreviewed ? Spinner : <span className='fa fa-paper-plane' />}
                                                    {sendingPreviewed ? 'Sending' : 'Send to ' + this.state.recipients[this.state.bodyPreviewIndex]?.name }
                                                </Button>
                                            </Col>
                                        }
                                    </Row>
                                </TabPane>
                            </TabContent>
                            </div>
                        </ControlWrapper>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <FormGroup key='button'>
                            <Label />
                            <Col sm={10}>
                                <Button disabled={this.state.recipients.length === 0} onClick={onSend}>
                                    {sending ? Spinner : <span className='fa fa-paper-plane' />}
                                    {sending ? 'Sending' : 'Send to ' + this.state.recipients.length + ' recipient(s)' }
                                </Button>
                                &nbsp;
                            </Col>
                        </FormGroup>
                    </Col>
                </Row>
            </Container>
        ]
    }

    private setRecipients(options: string): Promise<any>  {
        return new Promise<any>((resolve) => {
            const recipients = this.filterRecipients(options)
            const recipientNames = this.recipientNames(recipients)
            this.setState({ options, recipients, recipientNames}, () => {
                const bodyPreviewIndex = 0
                const bodyPreview = this.getBodyPreviewText(bodyPreviewIndex)
                this.setState({ bodyPreview, bodyPreviewIndex}, () => {
                    resolve(options)
                })
            })
        })
    }

    private recipientNames(recipients: IParticipant[]): string {
        return recipients
            .map(p => p.name + ' <' + p.email.trim() + '>')
            .join('; ')
    }

    private filterRecipients(options: string): IParticipant[] {
        return this.props.participants
            .filter(p => this.filterRecipient(p, options))
    }

    private filterRecipient(p: IParticipant, options: string): boolean {
        return !p.isDeleted && this.filterByOption(p, options) && p.email.trim().length > 0
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

    private getBodyPreviewText(index: number): string
    {
        const p = this.state.recipients[index]
        const bodyPreviewText = p ? this.getParticipantEmailText(p, this.props.participantCosts[p.id]) : ''
        return bodyPreviewText
    }

    private getParticipantEmailText(participant: IParticipant, participantCosts: IParticipantCosts) {
        let text = this.state.bodyTemplate?.replaceAll(this.recipientNameTag, participant.name)
                .replaceAll(this.recipientBalanceStatusTag, this.getPaymentStatusText(participantCosts))
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


        const fees = []
        if (participantCosts.nonMemberFee ?? 0 !== 0) {
            fees.push('the non-member fee of $' + participantCosts.nonMemberFee)
        }
        if (participantCosts.otherFees ?? 0 !== 0) {
            fees.push('other fees, such as hut or gear hire, of $' + participantCosts.otherFees)
        }
        if (fees.length > 0) {
            paymentStatusText += ' (Note that this includes ' + fees.join(" and ") + ')'
        }
        return paymentStatusText
    }
}
