import * as React from 'react';
import { Component } from 'react';
import { InputControl, TextAreaInputControl } from './Control';
import { App } from './App';
import { Trip } from './Trip';
import { IValidation } from './Interfaces';
import { BindMethods, GetFullDate } from './Utilities';
import { Badge, Col, FormGroup, Label, Button, Row, Container } from 'reactstrap';
import { Spinner } from './Widgets';

export class Email extends Component<{
    owner: Trip
    app: App
}, {
    recipients?: string
    names?: string
    subject?: string
    body?: string
    sending?: boolean
    copying?: undefined | 'names' | 'recipients'
    copied?: undefined | 'names' | 'recipients'
}>{
    public app: App

    constructor(props: any) {
        super(props)

        this.state = {
            recipients: this.props.owner.state.participants.filter(p => !p.isDeleted).map(p => p.email).join('; '),
            names: this.props.owner.state.participants.filter(p => !p.isDeleted).map(p => p.name).join(', '),
            subject: `Re: ${this.props.owner.state.trip.title} on ${GetFullDate(this.props.owner.state.trip.tripDate)}`,
            body: '',
        }
        this.app = this.props.app
        BindMethods(this)
    }

    public onSend() {
        this.setState({ sending: true })
        this.app.triphubApiCall('POST', this.props.owner.props.href + '/email', this.state, true)
            .then(() => this.setState({ sending: false }))
    }

    public async copy(field: 'names' | 'recipients') {
        this.setState({ copying: field });
        await new Promise(res => setTimeout(res, 1000))
        const textarea = document.createElement('textarea')
        document.body.appendChild(textarea)
        textarea.value = `${this.state[field]}`
        textarea.select()
        textarea.setSelectionRange(0, textarea.value.length);
        (document as any).execCommand('copy')
        document.body.removeChild(textarea)
        this.setState({ copied: field, copying: undefined });
        await new Promise(res => setTimeout(res, 5000))
        this.setState({ copied: undefined });
    }

 
    public render() {
        const { sending, copying, copied } = this.state;
        const validations: IValidation[] = this.props.app.mandatory(this.state, ['subject', 'body']);
        const onGet = (field: string): any => this.state[field]
        const onSet = (field: string, value: any): void => this.setState({ [field]: value })
        const onSave = (_: string, __: any): Promise<void> => Promise.resolve()
        const onCopyNames = () => this.copy('names')
        const onCopyRecipients = () => this.copy('recipients')
        const onGetValidationMessage = (id: string): any => {
            const found: IValidation | undefined = validations.find(v => v.field === id && !v.ok);
            return found ? found.message : null;
        }
        const onSend = () => this.onSend();

        const common = {
            id: 'email',
            onGet, onSet, onSave, onGetValidationMessage
        }

        return [
            <Container key='detail' fluid={true}>
                <Row>
                    <Col>
                        <TextAreaInputControl key={copying ?? 'recipients'} field={copying ?? 'recipients'}
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
                        <TextAreaInputControl key='body' field='body' label='Body' {...common} />
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
                                <Button onClick={onCopyNames}>
                                    {copying === 'names' ? Spinner : <span className='fa fa-copy' />}
                                    {copying === 'names' ? 'Copying ' : copied === 'names' ? 'Copied ' : 'Copy '}
                                    Names
                                </Button>
                                &nbsp;
                                <Button onClick={onCopyRecipients}>
                                    {copying === 'recipients' ? Spinner : <span className='fa fa-copy' />}
                                    {copying === 'recipients' ? 'Copying ' : copied === 'recipients' ? 'Copied ' : 'Copy '}
                                    Email Addresses
                                </Button>
                            </Col>
                        </FormGroup>
                    </Col>
                </Row>
            </Container>
        ]
    }
}
