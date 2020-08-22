import 'bootstrap/dist/css/bootstrap.min.css';
import { Component } from 'react';
import * as React from 'react';
import { Collapse, Card, CardHeader  } from 'reactstrap';
import './index.css';

export class Accordian extends Component<{
    id : string
    expanded? : boolean
    title? : any
    className? : string
    headerClassName? : string
    ondemand?: ()=>any
},{
    expanded : boolean
    demanded? : any
}> {
constructor(props: any) {
    super(props)
    this.state = {
        expanded: props.expanded
    }
}

public render() {
    const toggle = () => this.setState({
        expanded: !this.state.expanded,
        demanded: this.state.demanded || (this.props.ondemand && this.props.ondemand())
    })

    return [(
            <Card className={'accordian ' + this.props.className}>
                <CardHeader className={this.props.headerClassName + ' accordian-header'} onClick={toggle}>
                    <span className={'accordian-expand ' + (this.state.expanded ? 'fa fa-chevron-up' : 'fa fa-chevron-down')}/>
                    {this.props.title}
                </CardHeader>
                <Collapse key={this.props.id} id={this.props.id} isOpen={this.state.expanded}>
                    {this.state.demanded || this.props.children}
                </Collapse>
            </Card>
        )]
    }
}

