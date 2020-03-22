import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Badge, FormGroup, Input, FormText  } from 'reactstrap';
import './index.css';
import { Spinner } from '.';
import Textarea from 'react-textarea-autosize';
import Switch from "react-switch";

// export interface IControlOwner {
//     app : App
//     href? : string
//     get(id : string) : any
//     set(id : string, val : any):void
//     validate() : IValidation[]
// }

// export class SaveableControl extends Component<{
//       type : string 
//       owner : IControlOwner 
//       id : string 
//       label : string
//       hidden? : boolean
//       readOnly? : boolean
//       list? : any
//       affected? : string[]
//       radioOptions? : {[id:string]: any}
//     },{
//       saving : boolean
//       changed : boolean
//       prevValue? : any
//       saveIntervalId? : any
//     }> {

//     private affected : string[]

//     constructor(props : any){
//         super(props)
//         this.state = {saving: false, changed: false}
//         this.affected = [this.props.id, ...(this.props.affected || [])]
//         this.handleFocus = this.handleFocus.bind(this)
//         this.handleBlur = this.handleBlur.bind(this)
//         this.handleChange = this.handleChange.bind(this)
//         this.handleButtonFocus = this.handleButtonFocus.bind(this)
//         this.save = this.save.bind(this)
//         this.cancel = this.cancel.bind(this)
//     }

//     public handleButtonFocus(){
//         clearInterval(this.state.saveIntervalId)
//         this.setState({saveIntervalId: 0})
//     }

//     public handleFocus(){
//         console.log(this.props.owner.get(this.props.id))

//         this.setState({prevValue: this.affected.map(id => this.props.owner.get(id))})
//     }

//     public handleBlur(){
//         const value = this.props.owner.get(this.props.id)
        
//         if (value === this.state.prevValue[0] || this.props.owner.href === undefined) {
//             this.setState({saving: false, changed: false})
//         } else {
//             this.setState({saveIntervalId: setTimeout(this.save, 100)})
//         }
//     }

//     public save(){
//         const body = {}

//         for (const id of this.affected) {
//             body[id] = this.props.owner.get(id)
//         }

//         clearInterval(this.state.saveIntervalId)

//         this.setState({saving: true, changed: true, saveIntervalId: 0})
//         this.props.owner.app.apiCall('POST', this.props.owner.href as string, body, true)
//             .then(() => {
//                 this.setState({saving: false, changed: false})
//             })
//         }

//     public cancel(){ 
//         clearInterval(this.state.saveIntervalId)
//         this.setState({saving: false, changed: false})

//         for (let i = this.affected.length-1; i >= 0; i--) {
//             this.props.owner.set(this.affected[i], this.state.prevValue[i])
//         }
//     }

//     public handleChange(event : any){
//         const value = this.props.type === 'radio' ? (this.props.radioOptions || {})[event.target.value] : 
//                       this.props.type === 'checkbox' ? event.target.checked : 
//                       this.props.type === 'number' ? parseFloat(event.target.value) : event.target.value

//         if (value === this.state.prevValue[0] || !this.props.owner.href) {
//             this.setState({saving: false, changed: false})
//         } else {
//             this.setState({saving: false, changed: true})
//         }

//         this.props.owner.set(this.props.id, value)
//     }

//     public render() {
//         const value = this.props.owner.get(this.props.id)
//         const validation = this.props.owner.validate()
//         const validationMessage = (validation.find(m => m.id === this.props.id && !m.ok) || {message:null}).message
//         const valueProp = this.props.type === 'checkbox' ? {checked:!!value} : {value: (value || '')}
//         const controlProp = {readOnly: this.props.readOnly, onFocus: this.handleFocus, onBlur: this.handleBlur, onChange: this.handleChange}
//         const id = (this.props.owner.href || '').replace(/[/:.]/g,'')+'_'+this.props.id
//         const radioOptions = this.props.radioOptions || {}

//         return  (
//             <FormGroup hidden={this.props.hidden}>
//                 <FormText for={this.props.id} color='muted'>{this.props.label}</FormText>
//                 {this.props.type === 'textarea' ?
//                     <Textarea id={id} {...valueProp} {...controlProp} className='form-control'/> :
//                 this.props.type === 'radio'  ?
//                     Object.keys(radioOptions).map((key,i) => 
//                         <Label key={`${id}_${i}`}>
//                             <Input id={`${id}_${i}`} name={id} type={this.props.type as InputType}
//                                     checked={value === radioOptions[key]} value={key} {...controlProp}/>
//                                 {key}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
//                         </Label>) :
//                     <Input id={id} {...valueProp} {...controlProp} type={this.props.type as InputType}
//                         autoComplete='off' list={this.props.list}/>}
//                 <Badge color='warning' hidden={!validationMessage || this.props.owner.app.state.isLoading} size='sm' tabIndex={-1}>{validationMessage}</Badge>
//                 <Badge color='success' hidden={!this.state.saving} size='sm' tabIndex={-1}>Saving {Spinner}</Badge>
//             </FormGroup>
//         )
//     }
// }


export class ControlWrapper extends Component<{
        id : string, 
        label : string,
        hidden? : boolean,
        disabled?: boolean,
        onGetValidationMessage?: (id: string) => string,
        saving : boolean
    }, {
    }> {

    constructor(props : any) {
        super(props)
    }

    public render() {
        const validationMessage = this.props.onGetValidationMessage ? this.props.onGetValidationMessage(this.props.id) : null;
        return  (
            <FormGroup hidden={this.props.hidden} disabled={this.props.disabled}>
                <FormText for={this.props.id} color='muted'>{this.props.label}</FormText>
                {this.props.children}
                <Badge color='warning' hidden={!validationMessage} size='sm' tabIndex={-1}>{validationMessage}</Badge>
                <Badge color='success' hidden={!this.props.saving} size='sm' tabIndex={-1}>Saving {Spinner}</Badge>
            </FormGroup>
      )
    }
}

export class TextInputControl extends Component<{
    id : string, 
    label : string,
    hidden? : boolean,
    readOnly? : boolean,
    list? : any,
    validationMessage?: string,
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
        const onChange = (event: React.ChangeEvent) => {
            this.setState({saving: true});
            this.props.onSave(this.props.id, (event.target as any).value)
                .then(() => this.setState({saving: false}));
        }                
        return  (
            <ControlWrapper id={this.props.id} label={this.props.label} hidden={this.props.hidden} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                <Input id={this.props.id} value={value} type={'text'} readOnly={this.props.readOnly} list={this.props.list} onChange={onChange} autoComplete='off'/>
            </ControlWrapper>
      )
    }
}

export class TextAreaInputControl extends Component<{
    id : string, 
    label : string,
    hidden? : boolean,
    readOnly? : boolean,
    validationMessage?: string,
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
        const onChange = (event: React.ChangeEvent) => {
            this.setState({saving: true});
            this.props.onSave(this.props.id, (event.target as any).value)
                .then(() => this.setState({saving: false}));
        }                
        return  (
            <ControlWrapper id={this.props.id} label={this.props.label} hidden={this.props.hidden} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                <Textarea id={this.props.id} className='form-control' readOnly={this.props.readOnly} value={value} onChange={onChange}/> 
            </ControlWrapper>
      )
    }
}

export class DateInputControl extends Component<{
    id : string, 
    label : string,
    hidden? : boolean,
    readOnly? : boolean,
    validationMessage?: string,
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
        const onChange = (event: React.ChangeEvent) => {
            this.setState({saving: true});
            this.props.onSave(this.props.id, (event.target as any).value)
                .then(() => this.setState({saving: false}));
        }                
        return  (
            <ControlWrapper id={this.props.id} label={this.props.label} hidden={this.props.hidden} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                <Input id={this.props.id} value={value} type={'date'} readOnly={this.props.readOnly} onChange={onChange} autoComplete='off'/>
            </ControlWrapper>
      )
    }
}

export class NumberInputControl extends Component<{
    id : string, 
    label : string,
    hidden? : boolean,
    readOnly? : boolean,
    min? : number,
    max?: number,
    validationMessage?: string,
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
        const onChange = (event: React.ChangeEvent) => {
            this.setState({saving: true});
            this.props.onSave(this.props.id, parseFloat((event.target as any).value))
                .then(() => this.setState({saving: false}));
        }                
        return  (
            <ControlWrapper id={this.props.id} label={this.props.label} hidden={this.props.hidden} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                <Input id={this.props.id} value={value} min={this.props.min} max={this.props.max} type={'number'} readOnly={this.props.readOnly} onChange={onChange} autoComplete='off'/>
            </ControlWrapper>
      )
    }
}

export class SwitchControl extends Component<{
    id : string, 
    label : string,
    hidden? : boolean,
    validationMessage?: string,
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
            <ControlWrapper id={this.props.id} label={this.props.label} hidden={this.props.hidden} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.saving} >
                <Switch id={this.props.id} checked={value} onChange={onChange} className="react-switch" />
            </ControlWrapper>
      )
    }
}