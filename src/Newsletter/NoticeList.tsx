import { Component } from 'react';
import { INotice, IValidation } from '../Interfaces';
import '../index.css';
import { SwitchControl, InputControl, TextAreaInputControl, SelectControl } from '../Control';
import { IsValidDateString, GetDateString, GetStartOfNextMonth, BindMethods } from '../Utilities';
import { Accordian } from '../Accordian';
import { NoticesService } from 'src/Services/NoticesService';
import ReactModal from 'react-modal';
import { Button, Table } from 'reactstrap';

class Section {
    public name: string = ''
    public title: string = ''
}


const Sections: Section[] = [
    { name: "Notice", title: "Notices" },
    { name: "Classified", title: "Classifieds" },
    { name: "Obituary", title: "Obituaries" }
]

class NoticeDetail extends Component<{
    notice: INotice,
    setDetail(notice: INotice): void
}, {
    isLoading: boolean
}> { 

    constructor(props: any) {
        super(props)
        this.state = { isLoading: false }
    }

    public render() {
        let validations: IValidation[] = this.validate(this.props.notice);

        const onGet = (field: string): any => {
            return this.props.notice[field];
        }

        const onSet = (field: string, value: any): void => {
            this.props.notice[field] = value
            this.props.setDetail(this.props.notice)
        }

        const onSave = (id: string, value: any): Promise<void> => {
            onSet(id, value)
            validations = this.validate(this.props.notice)
            // Don't actually save until the save button is pressed
            return Promise.resolve();
        }

        const onGetValidationMessage = (field: string): any => {
            const found: IValidation | undefined = 
                validations.find(validation => validation.field === field && !validation.ok);
            return found ? found.message : null;
        }

        const common = {
            id: 'notice',
            readOnly: false,
            isLoading: this.state.isLoading,
            owner: this,
            data: JSON.stringify(this.props.notice),
            'onGet': onGet,
            'onSet': onSet,
            'onSave': onSave,
            'onGetValidationMessage': onGetValidationMessage
        }

        return <div>
            <h2>Edit Notice</h2>
            <InputControl field='title' label='Title' type='text' {...common} />
            <InputControl field='date' label='Expiry Date' type='date' {...common} />
            <SelectControl field='section' label='Section' options={Sections.map(s => s.name)} {...common} />
            <TextAreaInputControl field='text' label='Text' {...common} />
            <SwitchControl field='publish' label='Publish' {...common} />
        </div>;
    }

    private validate(notice:INotice): IValidation[] {
        return [
            { field: 'title', ok: notice.title.length > 0, message: 'Must set a title!' },
            { field: 'text', ok: notice.text.length > 0, message: 'Must set some body text!' },
            { field: 'date', ok: IsValidDateString(notice.date), message: 'Expiry date is not valid' },
        ];
    }

}

export class NoticeList extends Component<{
}, {
    notices: INotice[],
    expiredNotices: INotice[],
    showDetailFor: INotice | null,
    showAllExpired: boolean,
}> {

    private readonly expiredLimit : number = 10;

    constructor(props: any) {
        super(props)
        this.state = {
            notices: [],
            expiredNotices: [],
            showDetailFor: null,
            showAllExpired: false,
        }
        BindMethods(this)
    }

    public componentDidMount() {
        this.requery();
    }

    public render() {
        const onNewNotice = () => this.onNewNotice();
        const onShowAll = () => this.onShowAll();
        const onSetDetail = (notice: INotice) => this.onSetDetail(notice);
        const onSaveDetail = () => this.onSaveDetail();
        const onCancelDetail = () => this.onCancelDetail();

        return [
            <Button onClick={onNewNotice} key="newNoticeButton" color="primary" className='my-2'><span className='fas fa-plus'/> New Notice</Button>,
            this.state.notices.length === 0 && <p className='newsletter-no-notices'>No notices - use the "New Notice" button or add an expired notice.</p>,
            Sections.map((section: Section) => {
                const notices = this.state.notices.filter(n => n.section === section.name)
                return notices.length === 0 ? null : <div key={section.name + "Notices"}>
                    <h3>{section.title}</h3>
                    <Table className='TripGroup table-fixed triphub-table-striped' size='sm'>
                        <thead>
                            <tr>
                                <th className='mobile-only' />
                                <th style={{ width: "50%" }}>Title</th>
                                <th style={{ width: "20%" }}>Expiry</th>
                                <th style={{ width: "15%" }}>Publish</th>
                                <th style={{ width: "15%" }}/>
                            </tr>
                        </thead>
                        <tbody>
                            {notices.map((notice, index, section_notices) => {
                                const onGet = (id: string): any => {
                                    return notice.publish
                                }
                                const onSave = (id: string, value: any): any => {
                                    return this.setPublishNotice(notice, value)
                                }
                                const onGetValidationMessage = (id: string): any => {
                                    return ''
                                }
                                const onClick = (): any => {
                                    return this.onEditNotice(notice);
                                }
                                const onUpClick = (): any => {
                                    return this.moveNoticeUp(notice);
                                }
                                const onDownClick = (): any => {
                                    return this.moveNoticeDown(notice);
                                }
                                return <tr key={"notice"+section.name+index}>
                                        <td className="mobile-only"  onClick={onClick}/>
                                        <td onClick={onClick}>{notice.title}</td>
                                        <td onClick={onClick}>{notice.date}</td>
                                        <td><SwitchControl id='publish' field='publish' label='' isLoading={false} onGet={onGet}
                                            onSave={onSave} onGetValidationMessage={onGetValidationMessage} /></td>
                                        <td>
                                        {(index!==0) && <Button onClick={onUpClick}><span className='fa fa-arrow-up' style={{marginRight: '0'}}/></Button> }
                                        {(index!==section_notices.length-1) && <Button onClick={onDownClick}><span className='fa fa-arrow-down' style={{marginRight: '0'}}/></Button>}
                                        </td>
                                    </tr>
                            })
                            }
                        </tbody>
                    </Table>
                </div>
            }
            ),
            <Accordian id='tripsSocials' className='trip-group' headerClassName='newsletter-group-sub-header' expanded={false}
                title='Expired Notices' key='expiredNotices'>
                <Table className="TripGroup" size='sm' striped={true}>
                    <thead>
                        <tr>
                            <th className='mobile-only'/>
                            <th>Title</th>
                            <th>Expired</th>
                            <th>Section</th>
                            <th/>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            this.state.expiredNotices.map( (notice:INotice) => {
                                const onAddClick = ():any => {
                                    return this.addToCurrentNewsletter(notice);
                                }
                                return <tr key={notice.title}>
                                            <td/>
                                            <td>{notice.title}</td>
                                            <td>{notice.date}</td>
                                            <td>{notice.section}</td>
                                            <td><Button onClick={onAddClick} color='primary'>Add</Button></td>
                                       </tr>
                            })
                        }
                    </tbody>
                </Table>
                {!this.state.showAllExpired && <Button onClick={onShowAll} color="primary" className="mr-1">Show All</Button>}
            </Accordian>,
            <ReactModal
                key="notice-edit-modal"
                isOpen={this.state.showDetailFor != null}
                contentLabel={"Notice Detail"}
                style={{
                    overlay: {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)'
                    },
                    // This is a bit of a hack, but position: fixed doesn't work properly in
                    // an iframe
                    content: {
                        position: 'fixed',
                        top: 'auto',
                        left: '50%',
                        right: 'auto',
                        bottom: '10%',
                        transform: 'translate(-50%, 0%)',
                        width: '600px',
                        maxWidth: '100%',
                        border: '1px solid #ccc',
                    }
                }}>
                {(this.state.showDetailFor != null) &&

                    <NoticeDetail notice={this.state.showDetailFor} setDetail={onSetDetail} />
                }
                <Button onClick={onSaveDetail} color="primary" className="mr-1">Save</Button>
                <Button onClick={onCancelDetail} className="mr-1">Cancel</Button>
            </ReactModal>
        ];
    }

    public onSetDetail(notice: INotice) {
        if (this.state.showDetailFor != null ) {
            this.setState({ showDetailFor: notice })
        }
    }

    public onSaveDetail() {
        if (this.state.showDetailFor != null ) {
            this.saveNotice(this.state.showDetailFor.id, this.state.showDetailFor)
            .then( ( notice : INotice[] ) => {
                this.requery();
                this.setState({ showDetailFor: null })
            })
        }
    }

    public onCancelDetail() {
        this.setState({ showDetailFor: null })
    }

    public onEditNotice(notice: INotice) {
        this.setState({ showDetailFor: {...notice} })
    }

    public onNewNotice() {
        const newNotice = { id: -1, title: "", text: "", date: GetDateString( GetStartOfNextMonth() ), publish: true, section: "Notice", order: this.getNextOrder() }
        this.setState({ showDetailFor: {...newNotice} })
    }

    private saveNotice(id: number, body: any): Promise<any> {
        if ( id === -1 ) {
            // New notice
            return NoticesService.postNewNotice(body);
        } else {
            // Updating an existing notice
            return NoticesService.postNotice(id, body);
        }
    }

    private addToCurrentNewsletter( notice : INotice ) {
        notice.date = GetDateString( GetStartOfNextMonth() )
        notice.order = this.getNextOrder()
        this.saveNotice(notice.id, notice).then( () => {
            this.requery()
        })
    }

    private setPublishNotice(notice: INotice, publish: boolean): Promise<INotice | null> {
        notice.publish = publish;
        return NoticesService.patchNotice(notice.id, notice)
    }

    private requery() {
        this.requeryCurrent();
        this.requeryExpired();
    }
    
    private requeryCurrent() {
        NoticesService.getNoticesCurrent()
        .then((notices: INotice[]) => {
            this.setState({ notices: this.filterNotices(notices) })
        })
    }

    private requeryExpired(apply_limit:boolean = true) {
        NoticesService.getNoticesExpired(apply_limit ? this.expiredLimit : undefined)
        .then((expiredNotices: INotice[]) => {
            this.setState({ expiredNotices: this.filterNotices(expiredNotices) })
        })
    }

    private filterNotices(notices:INotice[]) : INotice[] {
        const valid_section_names : string[] = Sections.map( s => s.name )
        return notices.filter( (notice) => valid_section_names.includes(notice.section) )
    }

    private onShowAll() {
        this.setState({showAllExpired: true})
        this.requeryExpired(false)
    }

    private moveNoticeUp(notice:INotice) {
        this.moveNotice(notice, true)
    }

    private moveNoticeDown(notice:INotice) {
        this.moveNotice(notice, false)
    }

    private moveNotice(notice:INotice, up: boolean) {
        // The simplest way to implement this is to:
        //  - Assume that the number space for ordering is shared
        //    between all sections, but..
        //  - We don't care about the order for expired notices
        //  - When we expire a notice we don't change the order of any notice
        //  - When we un-expire a notice, or create a new notice, we set it's order to the next available
        //    order number (e.g. the max order amongst un-expired orders plus one)
        //  - When a notice changes section the order does not change (this does
        //    mean that the initial order within it's new section will appear a bit
        //    random, but the user can change it, and has the nice feature that if
        //    you change a notice's section then change it back it will be in the
        //    same place it was to start with)
        //  - This means that each non-expired has a unique order, BUT the order
        //    numbers are not contiguous.
        //  SO, to move a notice up or down, we need to find the notice in the
        //  same section with the next lowes/highest order, then just swap their orders
        const section_notices = this.state.notices.filter( n => n.section === notice.section)
        // "Up" -> lower order
        const otherNotice = (up) ? section_notices.reverse().find( n => n.order < notice.order) : section_notices.find( n => n.order > notice.order)
        if (otherNotice != null) {
            // If we didn't find a notice with order the same
            // as newOrder then the operation doesn't make sense so do nothing
            const oldOrder = notice.order
            notice.order = otherNotice.order
            otherNotice.order = oldOrder
            this.saveNotice(notice.id, {order: notice.order})
            otherNotice.order = oldOrder
            this.saveNotice(otherNotice.id, {order: otherNotice.order})
            this.state.notices.sort( (n0, n1) => n0.order - n1.order)
            this.setState({notices: this.state.notices})
        }

    }

    private getNextOrder() {
        const notices = this.state.notices
        return (notices.length === 0) ? 0 : notices[notices.length-1].order + 1
    }

}
