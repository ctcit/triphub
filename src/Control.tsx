import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Badge, FormGroup, Input, FormText, Row, DropdownToggle, DropdownMenu, DropdownItem, ButtonDropdown, InputGroup, Label } from 'reactstrap';
import './index.css';
import { Spinner } from './Widgets';
import Textarea from 'react-textarea-autosize';
import Switch from "react-switch";
import { InputType } from 'reactstrap/types/lib/Input';

export class ControlWrapper extends Component<{
    id: string,
    field: string,
    label: string,
    hidden?: boolean,
    disabled?: boolean,
    isLoading?: boolean,
    onGetValidationMessage?: (id: string) => string,
    saving: boolean,
    helpText?: string,
    labelFor?: string,
    children?: React.ReactNode;
}, {
}> {

    constructor(props: any) {
        super(props)
    }

    public render() {
        const validationMessage = this.props.onGetValidationMessage ? this.props.onGetValidationMessage(this.props.field) : null;
        return (
            <FormGroup hidden={this.props.hidden} disabled={this.props.disabled || this.props.isLoading}>
                <Row>
                    <FormText id={this.props.id + '_formtext'} color='muted'>
                        <label htmlFor={this.props.labelFor}>{this.props.label}</label>
                    </FormText>
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
    id: string
    field: string
    label: string
    hidden?: boolean
    readOnly?: boolean
    isLoading?: boolean
    validationMessage?: string
    type: InputType
    list?: any
    min?: number
    max?: number
    step?: number
    placeholder?: any
    helpText?: string
    forceValidation?: boolean
    autoFocus?: boolean
    onGet: (id: string) => any
    onSet: (id: string, value: any) => void
    onSave: (id: string, value: any) => Promise<any>
    onGetValidationMessage: (id: string) => string
}, {
    oldValue: any
    saving: boolean
    helpText?: string
    showValidation: boolean
}> {

    constructor(props: any) {
        super(props);
        this.state = { oldValue: this.value, saving: false, showValidation: false }
    }

    get value(): any {
        return this.props.onGet(this.props.field)
    }

    public render() {
        const onFocus = (): void => {
            this.setState({ oldValue: this.value, helpText: this.props.helpText });
        }
        const onChange = (event: React.ChangeEvent) => {
            const value = 
                this.props.type === 'number' ? (event.target as any).valueAsNumber :
                this.props.type === 'date' ? (event.target as any).valueAsDate :
                (event.target as any).value
            this.props.onSet(this.props.field, value);
        }
        const onBlur = () => {
            this.setState({ helpText: undefined, showValidation: true })
            if (this.state.oldValue !== this.value) {
                this.setState({ saving: true });
                this.props.onSave(this.props.field, this.value)
                    .then(() => this.setState({ saving: false }));
            }
        }
        const onGetValidationMessage = (this.state.showValidation || this.props.forceValidation) ? this.props.onGetValidationMessage : undefined;
        let className = "triphub-input"
        if (onGetValidationMessage && onGetValidationMessage(this.props.field)) {
            className += " is-invalid"
        }

        const val = `${this.props.onGet(this.props.field)}`.replace(/\W/g, v => `${v.charCodeAt(0)}`)
        const id = this.props.id + '_' + this.props.field

        return (
            <ControlWrapper id={id + '_' + val} field={this.props.field} labelFor={id}
                label={this.props.label} hidden={this.props.hidden} isLoading={this.props.isLoading}
                onGetValidationMessage={onGetValidationMessage} saving={this.state.saving} 
                helpText={this.state.helpText}>
                <Input id={id} type={this.props.type} readOnly={this.props.readOnly} 
                    list={this.props.list} min={this.props.min} max={this.props.max} step={this.props.step}
                    value={this.value || ""} placeholder={this.props.placeholder}
                    onFocus={onFocus} onChange={onChange} onBlur={onBlur}
                    autoComplete='nope' autoFocus={this.props.autoFocus} className={className} />
            </ControlWrapper>
        )
    }
}

export class TextAreaInputControl extends Component<{
    id: string,
    field: string
    label: string,
    hidden?: boolean,
    readOnly?: boolean,
    style?: any,
    isLoading?: boolean,
    validationMessage?: string,
    helpText?: string,
    forceValidation?: boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<any>,
    onGetValidationMessage: (id: string) => string,
}, {
    oldValue: any,
    value: any,
    saving: boolean,
    helpText?: string,
    showValidation: boolean,
}> {

    constructor(props: any) {
        super(props);
        const oldValue = this.props.onGet(this.props.field);
        this.state = { oldValue, value: oldValue, saving: false, showValidation: false }
    }

    public render() {
        const id = this.props.id + '_' + this.props.field
        const onFocus = (): void => {
            const oldValue = this.props.onGet(this.props.field);
            this.setState({ oldValue, value: oldValue, helpText: this.props.helpText });
        }
        const onChange = (event: React.ChangeEvent) => {
            const newValue = (event.target as any).value;
            this.setState({ value: newValue });
        }
        const onBlur = () => {
            this.setState({ helpText: undefined, showValidation: true });
            if (this.state.oldValue !== this.state.value) {
                this.setState({ saving: true });
                this.props.onSave(this.props.field, this.state.value)
                    .then(() => this.setState({ saving: false }));
            }
        }
        const onGetValidationMessage = (this.state.showValidation || this.props.forceValidation) ? this.props.onGetValidationMessage : undefined;
        let className = "form-control textarea triphub-input"
        if (onGetValidationMessage && onGetValidationMessage(this.props.field)) {
            className += " is-invalid"
        }
        
        return (
            <ControlWrapper id={id} field={this.props.field} label={this.props.label} labelFor={id}
                hidden={this.props.hidden} isLoading={this.props.isLoading}
                onGetValidationMessage={onGetValidationMessage} saving={this.state.saving} helpText={this.state.helpText} >
                <Textarea id={id} className={className} readOnly={this.props.readOnly}
                    value={this.state.value} onFocus={onFocus} onChange={onChange} onBlur={onBlur} style={this.props.style} />
            </ControlWrapper>
        )
    }
}

export class SwitchControl extends Component<{
    id: string,
    field: string
    label: string,
    hidden?: boolean,
    isLoading?: boolean,
    validationMessage?: string,
    readOnly?: boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<any>,
    onGetValidationMessage: (id: string) => string
}, {
    saving: boolean
}> {

    constructor(props: any) {
        super(props);
        this.state = { saving: false }
    }

    public render() {
        const id = this.props.id + '_' + this.props.field
        const value = this.props.onGet(this.props.field);
        const onChange = (checked: boolean) => {
            this.setState({ saving: true });
            this.props.onSave(this.props.field, checked)
                .then(() => this.setState({ saving: false }));
        }
        return (
            <ControlWrapper id={id} field={this.props.field} 
                label={this.props.label} labelFor={id}
                hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage}
                saving={this.state.saving} >
                <Switch id={id} checked={value || false} onChange={onChange}
                    className="react-switch" disabled={this.props.readOnly} />
            </ControlWrapper>
        )
    }
}

export class SwitchesControl extends Component<{
    id: string,
    field: string
    label: string,
    hidden?: boolean,
    isLoading?: boolean,
    validationMessage?: string,
    readOnly?: boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<any>,
    onGetValidationMessage: (id: string) => string,
    options: string,
    allOptions: string,
}, {
    saving: boolean
}> {

    constructor(props: any) {
        super(props);
        this.state = { saving: false }
    }

    public render() {
        const value = this.value
        const options = this.parse(this.props.options)
        const allOptions = this.parse(this.props.allOptions)
        const switches = options.map(option => {
            const id = `${this.props.id}_${allOptions.indexOf(option)}`
            const selected = value.some(v => v === option)
            const onChange = (checked: boolean) => {
                const newValue = this.value.filter(v => v !== option)

                if (checked) {
                    newValue.push(option)
                }
                newValue.sort((a, b) => allOptions.indexOf(a) - allOptions.indexOf(b))

                this.setState({ saving: true });
                this.props.onSave(this.props.field, newValue.join(', '))
                    .then(() => this.setState({ saving: false }));
            }

            return this.props.readOnly ? (selected ? <Badge key={id}>{option}</Badge> : null) :
                <table key={id}>
                    <tbody>
                        <tr>
                            <td style={{ verticalAlign: "center" }}>
                                <Switch id={id} key={id} checked={selected} onChange={onChange}
                                    className="react-switch" /></td>
                            <td style={{ verticalAlign: "center" }}>
                                <Label for={id}>{option}</Label></td>
                        </tr>
                    </tbody>
                </table>

        })

        return (
            <ControlWrapper id={this.props.id + '_' + this.props.field} field={this.props.field} label={this.props.label}
                hidden={this.props.hidden} isLoading={this.props.isLoading}
                onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                {switches}
            </ControlWrapper>
        )
    }

    private parse(value?: any): string[] {
        return `${value || ""}`.split(',').map(v => v.trim()).filter(v => v !== "")
    }
    private get value(): string[] {
        return this.parse(this.props.onGet(this.props.field))
    }
}

export class SelectControl extends Component<{
    id: string
    field: string
    label: string
    hidden?: boolean
    readOnly?: boolean
    isLoading?: boolean
    onGet: (field: string) => any
    onSave: (field: string, value: any) => Promise<any>
    onGetValidationMessage: (id: string) => string
    options: string[] | { [id: string]: string[] }
    data: string
    noSaveBadge?: boolean
}, {
    saving: boolean
}> {

    constructor(props: any) {
        super(props);
        this.state = { saving: false }
    }

    public render() {
        const id = this.props.id + '_' + this.props.field
        const onChange = (event: React.ChangeEvent) => {
            const newValue = (event.target as any).value;
            this.setState({ saving: !this.props.noSaveBadge });
            this.props.onSave(this.props.field, newValue)
                .then(() => this.setState({ saving: false }));
        }
        let options: JSX.Element[]

        if (Array.isArray(this.props.options)) {
            options = this.props.options.map((option, i) => <option value={option} key={i}>{option}</option>)
        } else {
            const groups = this.props.options as { [id: string]: string[] }

            options = Object.keys(groups).map((group, groupIndex) =>
                <optgroup label={group} key={groupIndex}>
                    {groups[group].map((option, i) =>
                        <option value={option} key={i}>{option}</option>)}
                </optgroup>
            )
        }

        return (
            <ControlWrapper id={id} field={this.props.field} 
                label={this.props.label} labelFor={id} hidden={this.props.hidden}
                isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage}
                saving={this.state.saving} >
                <Input id={id} type="select" readOnly={this.props.readOnly}
                    value={this.props.onGet(this.props.field)}
                    // data-data={this.props.data}
                    onChange={onChange} autoComplete='nope'>
                    {options}
                </Input>
            </ControlWrapper>
        )
    }
}

export class ComboBoxControl extends Component<{
    id: string,
    field: string
    label: string,
    hidden?: boolean,
    readOnly?: boolean,
    isLoading?: boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<any>,
    onGetValidationMessage: (id: string) => string,
    options: string[]
    helpText?: string,
}, {
    dropdownOpen: boolean,
    oldValue: any,
    value: any,
    saving: boolean
    helpText?: string,
}> {

    constructor(props: any) {
        super(props);
        const oldValue = this.props.onGet(this.props.field);
        this.state = { dropdownOpen: false, oldValue, value: oldValue, saving: false }
    }

    public render() {
        const id = this.props.id + '_' + this.props.field
        const dropdownToggle = (): void => {
            this.setState({ dropdownOpen: !this.state.dropdownOpen });
        }
        const onFocus = (): void => {
            const oldValue = this.props.onGet(this.props.field);
            this.setState({ oldValue, value: oldValue, helpText: this.props.helpText });
            setTimeout(() => this.setState({ dropdownOpen: true }), 300); // Hack to ensure dropdown stays open
        }
        const onChange = (event: React.ChangeEvent) => {
            const newValue = (event.target as any).value;
            this.setState({ value: newValue });
        }
        const onBlur = () => {
            if (this.state.oldValue !== this.state.value) {
                this.setState({ saving: true, helpText: undefined });
                this.props.onSave(this.props.field, this.state.value)
                    .then(() => this.setState({ saving: false }));
            }
        }
        const onClick = (event: any) => {
            const newValue = event.currentTarget.textContent;
            if (this.state.oldValue !== newValue) {
                this.setState({ value: newValue, saving: true });
                this.props.onSave(this.props.field, newValue)
                    .then(() => this.setState({ saving: false }));
            }
        }

        return (
            <ControlWrapper id={id} field={this.props.field} 
                label={this.props.label} labelFor={id} hidden={this.props.hidden}
                isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage}
                saving={this.state.saving} helpText={this.state.helpText} >
                <InputGroup>
                    <Input id={id} type="text" readOnly={this.props.readOnly} value={this.state.value}
                        onFocus={onFocus} onChange={onChange} onBlur={onBlur} autoComplete='nope' />
                    <ButtonDropdown isOpen={this.state.dropdownOpen} toggle={dropdownToggle} hidden={this.props.readOnly}>
                        <DropdownToggle color='transparent' caret={true} />
                        <DropdownMenu end={true}>
                            {this.props.options.map((value, i) =>
                                <div key={i} onClick={onClick}><DropdownItem>{value}</DropdownItem></div>
                            )}
                        </DropdownMenu>
                    </ButtonDropdown>
                </InputGroup>
            </ControlWrapper>
        )
    }
}