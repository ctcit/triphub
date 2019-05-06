import { App } from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { Component } from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Tooltip  } from 'reactstrap';
import './index.css';
import registerServiceWorker from './registerServiceWorker';
// import autosize from 'autosize';

// use this chrome plugin to get this working if running locally using "npm start"
// https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi/related?hl=en
export const BaseUrl = 'https://ctc.org.nz/triphub.dev/api/api.php'
export const BaseOpt = {'Api-Key':'6bc3ed05-66a4-4012-96bd-c7192df95997','Api-User-Id':'125'}
export const Spinner = <span className='fa fa-spinner fa-spin' key='spinner'/>

export class ToolTipIcon extends Component<{
    tooltip: any 
    id: string
    icon?: string 
    className? : string
},{
    isOpen:boolean
}>{
    constructor(props : any){
        super(props)
        this.state = {isOpen: false}
    }

    public render() {
        const toggle = () => this.setState({isOpen: !this.state.isOpen})
        const id = `tooltipicon_${this.props.icon || this.props.id}_${this.props.id}`
        return [
            this.props.icon
                ? <span key={this.props.id} id={id} className={`fa fa-${this.props.icon} ${this.props.className}`}/>
                : <span key={this.props.id} id={id}>{this.props.children}</span>,
            <Tooltip key={this.props.id + '_tooltip'} isOpen={this.state.isOpen} target={id} toggle={toggle}>
                {this.props.tooltip}
            </Tooltip>
        ]
    }
}

ReactDOM.render(<App/>, document.getElementById('root'))
registerServiceWorker()

