import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Badge, FormGroup, Input, FormText, Row } from 'reactstrap';
import './index.css';
import { Spinner } from './Widgets';
import Textarea from 'react-textarea-autosize';
import Switch from "react-switch";
import { InputType } from 'reactstrap/lib/Input';

export class ControlWrapper extends Component<{
        id : string, 
        label : string,
        hidden? : boolean,
        disabled?: boolean,
        isLoading: boolean,
        onGetValidationMessage?: (id: string) => string,
        saving : boolean,
        helpText? : string,
    }, {
    }> {

    constructor(props : any) {
        super(props)
    }

    public render() {
        const validationMessage = this.props.onGetValidationMessage ? this.props.onGetValidationMessage(this.props.id) : null;
        return  (
            <FormGroup hidden={this.props.hidden} disabled={this.props.disabled || this.props.isLoading}>
                <Row noGutters={true}>
                    <FormText id={this.props.id} color='muted'>{this.props.label}</FormText>
                    <Badge color='success' hidden={!this.props.saving} className='ml-sm-2' tabIndex={-1}>Saving {Spinner}</Badge>
                </Row>
                {this.props.children}
                <small hidden={this.props.helpText === undefined} className="form-text triphub-form-help">{this.props.helpText}</small>
                <Badge color='warning' hidden={!validationMessage || this.props.isLoading} size='sm' tabIndex={-1}>{validationMessage}</Badge>
            </FormGroup>
      )
    }
}

export class InputControl extends Component<{
    id : string, 
    label : string,
    hidden? : boolean,
    readOnly? : boolean,
    isLoading: boolean,
    validationMessage?: string,
    type: InputType,
    list? : any,
    min? : number,
    max?: number,
    helpText?: string,
    forceValidation?: boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<void>,
    onGetValidationMessage: (id: string) => string
}, {
    oldValue: any,
    value: any,
    saving : boolean,
    helpText?: string,
    showValidation: boolean,
}> {

    constructor(props : any) {
        super(props);
        const oldValue = this.props.onGet(this.props.id);
        this.state = {oldValue, value: oldValue, saving: false, showValidation: false}
    }

    public render() {
        const onFocus = (): void => {
            const oldValue = this.props.onGet(this.props.id);
            this.setState({ oldValue, value: oldValue, helpText: this.props.helpText});
        }
        const onChange = (event: React.ChangeEvent) => {
            const newValue = (event.target as any).value;
            this.setState({ value: newValue });
        }
        const onBlur = () => {
            this.setState({ helpText: undefined, showValidation: true })
            if (this.state.oldValue !== this.state.value) {
                this.setState({saving: true});
                this.props.onSave(this.props.id, this.state.value)
                    .then(() => this.setState({saving: false}));
            }
        } 
        const onGetValidationMessage = (this.state.showValidation || this.props.forceValidation) ? this.props.onGetValidationMessage : undefined;
        let className = "triphub-input"
        if ((onGetValidationMessage !== undefined) && onGetValidationMessage(this.props.id) !== null) {
            className += " is-invalid"
        }
        
        return  (
            <ControlWrapper id={this.props.id} label={this.props.label} hidden={this.props.hidden} isLoading={this.props.isLoading}
               onGetValidationMessage={onGetValidationMessage} saving={this.state.saving} helpText={this.state.helpText}>
                <Input id={this.props.id} type={this.props.type} readOnly={this.props.readOnly} list={this.props.list} min={this.props.min} max={this.props.max}  
                    value={this.state.value || ""} onFocus={onFocus} onChange={onChange} onBlur={onBlur} autoComplete='off'
                    className={className} />
            </ControlWrapper>
      )
   }
}

export class TextAreaInputControl extends Component<{
    id : string, 
    label : string,
    hidden? : boolean,
    readOnly? : boolean,
    isLoading: boolean,
    validationMessage?: string,
    helpText?: string,
    forceValidation?: boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<void>,
    onGetValidationMessage: (id: string) => string
}, {
    oldValue: any,
    value: any,
    saving : boolean,
    helpText?: string,
    showValidation: boolean,
}> {

    constructor(props : any)     {
        super(props);
        const oldValue = this.props.onGet(this.props.id);
        this.state = {oldValue, value: oldValue, saving: false, showValidation: false }
    }

    public render() {
        const onFocus = (): void => {
            const oldValue = this.props.onGet(this.props.id);
            this.setState({ oldValue, value: oldValue, helpText: this.props.helpText });
        }
        const onChange = (event: React.ChangeEvent) => {
            const newValue = (event.target as any).value;
            this.setState({ value: newValue });
        }
        const onBlur = () => {
            this.setState({helpText: undefined, showValidation: true});
            if (this.state.oldValue !== this.state.value) {
                this.setState({saving: true});
                this.props.onSave(this.props.id, this.state.value)
                    .then(() => this.setState({saving: false}));
            }
        } 
        const onGetValidationMessage = (this.state.showValidation || this.props.forceValidation) ? this.props.onGetValidationMessage : undefined;
        let className = "form-control textarea triphub-input"
        if ((onGetValidationMessage !== undefined) && onGetValidationMessage(this.props.id) !== null) {
            className += " is-invalid"
        }
        return  (
            <ControlWrapper id={this.props.id} label={this.props.label} hidden={this.props.hidden} isLoading={this.props.isLoading}
                onGetValidationMessage={onGetValidationMessage} saving={this.state.saving} helpText={this.state.helpText} >
                <Textarea id={this.props.id} className={className} readOnly={this.props.readOnly}  
                    value={this.state.value} onFocus={onFocus} onChange={onChange} onBlur={onBlur} rows={6} />
            </ControlWrapper>
      )
    }
}

export class SwitchControl extends Component<{
    id : string, 
    label : string,
    hidden? : boolean,
    isLoading: boolean,
    validationMessage?: string,
    readOnly? : boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<void>,
    onGetValidationMessage: (id: string) => string
}, {
    saving : boolean
}> {

    constructor(props : any)     {
        super(props);
        this.state = {saving: false}
    }

    public render() {
        const value = this.props.onGet(this.props.id);
        const onChange = (checked: boolean) => {
            this.setState({saving: true});
            this.props.onSave(this.props.id, checked)
                .then(() => this.setState({saving: false}));
        }                
        return  (
            <ControlWrapper id={this.props.id} label={this.props.label} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                <Switch id={this.props.id} checked={value || false} onChange={onChange} className="react-switch" disabled={this.props.readOnly} />
            </ControlWrapper>
      )
    }
}

export class SelectControl extends Component<{
    id : string, 
    label : string,
    hidden? : boolean,
    readOnly? : boolean,
    isLoading: boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<void>,
    onGetValidationMessage: (id: string) => string,
    options: object
}, {
    oldValue: any,
    value: any,
    saving : boolean
}> {

    constructor(props : any)     {
        super(props);
        const oldValue = this.props.onGet(this.props.id);
        this.state = {oldValue, value: oldValue, saving: false}
    }

    public render() {
        const onFocus = (): void => {
            const oldValue = this.props.onGet(this.props.id);
            this.setState({ oldValue, value: oldValue });
        }
        const onChange = (event: React.ChangeEvent) => {
            const newValue = (event.target as any).value;
            this.setState({ value: newValue });
        }
        const onBlur = () => {
            if (this.state.oldValue !== this.state.value) {
                this.setState({saving: true});
                this.props.onSave(this.props.id, this.state.value)
                    .then(() => this.setState({saving: false}));
            }
        } 
        
        return  (
            <ControlWrapper id={this.props.id} label={this.props.label} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                <Input id={this.props.id} type="select" readOnly={this.props.readOnly} value={this.state.value} onFocus={onFocus} onChange={onChange} onBlur={onBlur} autoComplete='off'>
                    {Object.keys(this.props.options).map( (key:any) => {
                        return <option value={key} key={key}>{this.props.options[key]}</option>
                    })}
                </Input>
            </ControlWrapper>
      )
   }
}