import * as React from 'react';
import { Component } from 'react';
import { GetDate } from './Utilities';
import { Button } from 'reactstrap';
import { INewsletter } from './Interfaces';
import './index.css';
import './print.css';
import { NewsletterGroup } from './NewsletterGroup';


export class NewsletterLine extends Component<{
    owner: NewsletterGroup,
    newsletter: INewsletter,
    },{}> {
    constructor(props: any){
        super(props)
        this.onEditClick = this.onEditClick.bind(this) 
        this.onGenerateClick = this.onGenerateClick.bind(this) 
    }

    public onEditClick() {
        this.props.owner.props.app.setPath('/newsletters/' + this.props.newsletter.id)
    }

    public onGenerateClick() {
        window.location.href = "https://ctc.org.nz/newsletter/generate.php?expand=newsletter.odt"
    }

    public render(){
        const newsletter = this.props.newsletter
        const id = newsletter.id

        return [
            <tr>
                <td key={'volume' + id}>
                    {newsletter.volume}
                </td>
                <td key={'number' + id}>
                    {newsletter.number}
                </td>
                <td key={'date' + id}>
                    {GetDate(newsletter.date)}
                </td>
                <td key={'issueDate' + id}>
                    {GetDate(newsletter.issueDate)}
                </td>
                <td key={'Links' + id}>
                    <Button color='link' onClick={this.onEditClick}>Edit</Button>
                    <Button color='link' onClick={this.onGenerateClick}>Generate</Button>
                </td>
            </tr>
        ]
    }
}
