import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Badge,Col, FormGroup, Input,Label, Button  } from 'reactstrap';
import { InputType } from 'reactstrap/lib/Input';
import './index.css';
import { App } from './App';
import { Spinner } from '.';
import Textarea from 'react-textarea-autosize';
import { IValidation } from './Interfaces';

export interface IControlOwner {
    app : App
    href? : string
    get(id : string) : any
    set(id : string, val : any):void
    validate() : IValidation[]
}

export class Control extends Component<{
      type : string 
      owner : IControlOwner 
      id : string 
      label : string
      hidden? : boolean
      readOnly? : boolean
      list? : any
      affected? : string[]
    },{
      saving : boolean
      changed : boolean
      prevValue? : any
      saveIntervalId? : any
    }> {

    private affected : string[]

    constructor(props : any){
        super(props)
        this.state = {saving: false, changed: false}
        this.affected = [this.props.id, ...(this.props.affected || [])]
        this.handleFocus = this.handleFocus.bind(this)
        this.handleBlur = this.handleBlur.bind(this)
        this.handleChange = this.handleChange.bind(this)
        this.handleButtonFocus = this.handleButtonFocus.bind(this)
        this.save = this.save.bind(this)
        this.cancel = this.cancel.bind(this)
    }

    public handleButtonFocus(){
        clearInterval(this.state.saveIntervalId)
        this.setState({saveIntervalId: 0})
    }

    public handleFocus(){
        console.log(this.props.owner.get(this.props.id))

        this.setState({prevValue: this.affected.map(id => this.props.owner.get(id))})
    }

    public handleBlur(){
        const value = this.props.owner.get(this.props.id)
        
        if (value === this.state.prevValue[0] || this.props.owner.href === undefined) {
            this.setState({saving: false, changed: false})
        } else {
            this.setState({saveIntervalId: setTimeout(this.save, 100)})
        }
    }

    public save(){
        const body = {}

        for (const id of this.affected) {
            body[id] = this.props.owner.get(id)
        }

        clearInterval(this.state.saveIntervalId)

        this.setState({saving: true, changed: true, saveIntervalId: 0})
        this.props.owner.app.apiCall('POST', this.props.owner.href as string, body, true)
            .then(() => {
                this.setState({saving: false, changed: false})
            })
        }

    public cancel(){ 
        clearInterval(this.state.saveIntervalId)
        this.setState({saving: false, changed: false})

        for (let i = this.affected.length-1; i >= 0; i--) {
            this.props.owner.set(this.affected[i], this.state.prevValue[i])
        }
    }

    public handleChange(event : any){
        const value = this.props.type === 'checkbox' ? event.target.checked : 
                      this.props.type === 'number' ? parseFloat(event.target.value) : event.target.value

        if (value === this.state.prevValue[0] || !this.props.owner.href) {
            this.setState({saving: false, changed: false})
        } else {
            this.setState({saving: false, changed: true})
        }

        this.props.owner.set(this.props.id, value)
    }

    public render() {
        const value = this.props.owner.get(this.props.id)
        const validation = this.props.owner.validate()
        const validationMessage = (validation.find(m => m.id === this.props.id && !m.ok) || {message:null}).message
        const valueProp = {[this.props.type === 'checkbox' ? 'checked' : 'value'] : value}
        const controlProp = {readOnly: this.props.readOnly, onFocus: this.handleFocus, onBlur: this.handleBlur, onChange: this.handleChange}

        return  (
            <FormGroup hidden={this.props.hidden} row={true}>
                <Label sm={2} for={this.props.id}>{this.props.label}</Label>
                <Col sm={8}>
                    {this.props.type === 'textarea' ?
                        <Textarea id={this.props.id} {...valueProp} {...controlProp} className='form-control'/> :
                        <Input id={this.props.id} {...valueProp} {...controlProp} type={this.props.type as InputType}
                            autoComplete='off' list={this.props.list}/>}
                </Col>
                <Col sm={2}>
                    <Badge color='warning' hidden={!validationMessage || this.props.owner.app.state.isLoading} size='sm' tabIndex={-1}>{validationMessage}</Badge>
                    <Button size='sm' hidden={!this.state.changed || !!validationMessage} onClick={this.save} onFocus={this.handleButtonFocus} onBlur={this.handleBlur}>
                        {this.state.saving ? [ 'Saving ', Spinner ] : 'Save'}
                    </Button>
                    <Button size='sm' hidden={!this.state.changed || this.state.saving} onClick={this.cancel} onFocus={this.handleButtonFocus} onBlur={this.handleBlur}>
                        Cancel
                    </Button>
                </Col>
            </FormGroup>
        )
    }
}
