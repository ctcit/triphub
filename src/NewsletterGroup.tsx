import { Component } from 'react'
import { App } from './App'
import { INewsletter } from './Interfaces'
import Table from 'reactstrap/lib/Table'
import * as React from 'react'
import { NewsletterLine } from './NewsletterLine'

export class NewsletterGroup extends Component<{
    app: App
    newsletters: INewsletter[]
  },{
  }> {
  constructor(props: any){
      super(props)
  }

    public render(){
        return  (
            <Table className='NewsletterGroup' size='sm' striped={true}>
                <thead>
                    <tr>
                        <th className='mobile-only'/>
                        <th>Volume</th>
                        <th>Number</th>
                        <th>Date</th>
                        <th>Issue Date</th>
                        <th/>
                    </tr>
                </thead>
                <tbody>
                    {this.props.newsletters.map(
                        (newsletter:INewsletter) => <NewsletterLine newsletter={newsletter} key={newsletter.id} owner={this} />)}
                </tbody>    
            </Table>
      )
  }
}