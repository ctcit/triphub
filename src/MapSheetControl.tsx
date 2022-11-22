import { ButtonGroup, Modal, ModalHeader, ModalBody, ModalFooter, Col, Row, FormText, ButtonDropdown, DropdownItem, DropdownToggle, DropdownMenu, Button } from 'reactstrap';
import { IMap, ITrip } from './Interfaces';
import { ControlWrapper } from './Control';
import Select, { ActionMeta } from 'react-select'
import { MapsService } from './Services/MapsService';
import { Component } from 'react';
import { MapSheetPicker } from './MapEditor/MapSheetPicker';

export class MapSheetControl extends Component<{
    id: string,
    label: string,
    hidden?: boolean,
    readOnly?: boolean,
    isLoading?: boolean,
    onGet: (id: string) => any,
    onSave: (id: string, value: any) => Promise<any>,
    onGetValidationMessage?: (id: string) => string,
}, {
    savingMapSheets: boolean,
    editing: boolean,
    editsMade: boolean,
    cancelDropdownOpen: boolean,
    busy: boolean, // loading archivedRoutes
    mapSheetSuggestions: { value: any, label: string }[]
}>{
    // selected map sheets
    public mapSheets: string[] = [];

    // selected map sheets
    private pendingMapSheets: string[] = []; // changed mapSheets before being saved

    // routes
    private pendingRoutesLatLngs: Array<Array<[number, number]>> = [];  // changed routes before being saved

    constructor(props: any) {
        super(props);

        this.mapSheets = this.getMapSheets();

        this.pendingMapSheets = this.mapSheets;

        this.state = {
            savingMapSheets: false,
            editing: false,
            editsMade: false,
            cancelDropdownOpen: false,
            busy: true,
            mapSheetSuggestions: Object.keys(MapsService.MapsBySheet).map((mapSheet: string) => {
                const nz50Map: IMap = MapsService.MapsBySheet[mapSheet];
                return { value: nz50Map.sheetCode, label: nz50Map.sheetCode + ' ' + nz50Map.name };
            })
        };
    }

    public render() {
        const onEdit = () => {
            this.setState({ editsMade: false, editing: true });
        }

        // changed in MapEditor - save deferred
        const onMapSheetsChanged = (mapSheets: string[]) => {
            this.pendingMapSheets = mapSheets;
            this.setState({ editsMade: true });
        }

        const onSave = () => {
            this.Save(this.pendingMapSheets);
        }
        const onCancel = () => {
            this.setState({ editsMade: false, editing: false });
        }
        const onCancelDropdownToggle = () => {
            this.setState({ cancelDropdownOpen: !this.state.cancelDropdownOpen });
        }

        // changed in TripMap - save immediate
        const onChange = (newMapsValue: any, actionMeta: ActionMeta<any>) => {
            this.saveSelectedMaps(newMapsValue.map((m: {value: string, label: string}) => m.value));
        }

        return (
            <div>
                <Row>
                    <Col>
                        <ControlWrapper id={this.props.id} field={this.props.id} label={this.props.label} hidden={this.props.hidden} isLoading={this.props.isLoading} onGetValidationMessage={this.props.onGetValidationMessage} saving={this.state.savingMapSheets} >
                        {/* {
                            this.mapSheets.length === 0 &&
                                <FormText color="muted">No maps selected&nbsp;&nbsp;</FormText>
                        } */}
                        { ((this.props.readOnly && this.mapSheets.length > 0) || !this.props.readOnly) &&
                            <ButtonGroup>
                                <Select
                                    autoFocus={false}
                                    value={this.getTags()}
                                    isMulti={true}
                                    isSearchable={true}
                                    options={this.state.mapSheetSuggestions}
                                    onChange={onChange}
                                    delimiter=','
                                    placeholder={'Start typing to add a map sheet by name'}
                                    isDisabled={this.props.readOnly}
                                    styles={{ control: (provided: any, state: any) => ({
                                            ...provided,
                                            minWidth: '300px'
                                        })}}
                                />
                                { !this.props.readOnly &&
                                    <span>&nbsp;
                                        <Button onClick={onEdit}>
                                            <span className='fa fa-map' />
                                            Pick map sheet
                                        </Button>
                                    </span>
                                }
                            </ButtonGroup>
                        }
                        </ControlWrapper>
                    </Col>
                    <Modal isOpen={this.state.editing} toggle={onSave}
                        size="lg" style={{ maxWidth: '1600px', width: '95%', margin: '10px auto' }} centered={true}>
                        <ModalHeader toggle={onSave}>Edit Routes/Maps</ModalHeader>
                        <ModalBody>
                            <MapSheetPicker
                                mapSheets={this.mapSheets}
                                onMapSheetsChanged={onMapSheetsChanged}
                            />
                        </ModalBody>
                        <ModalFooter>
                            {!this.state.editsMade && <Button color="secondary" onClick={onCancel}>Close</Button>}
                            {this.state.editsMade && <Button color="primary" onClick={onSave}>Save</Button>}
                            {this.state.editsMade &&
                                <ButtonDropdown color="secondary" drop={'right'} isOpen={this.state.cancelDropdownOpen} toggle={onCancelDropdownToggle}>
                                    <DropdownToggle caret={false}>Cancel</DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem color="red" onClick={onCancel}>Confirm discard changes</DropdownItem>
                                    </DropdownMenu>
                                </ButtonDropdown>
                            }
                        </ModalFooter>
                    </Modal>
                </Row>
            </div>
        );
    }

    private getMapSheets(): string[] {
        const mapSheets: string[] = [];
        const maps: string[] = this.props.onGet("maps") || [];
        maps.forEach(map => {
            if (map && map !== "") {
                const parts = map.split(" ");
                if (parts.length > 0 && MapsService.MapsBySheet[parts[0]]) {
                    mapSheets.push(parts[0]);
                }
            }
        });
        return mapSheets;
    }

    // -----------------

    private getTags(): { value: any, label: string }[] {
        if (!this.mapSheets) {
            return [];
        }
        return this.mapSheets.map((mapSheet: string) => 
            ({ value: mapSheet, label: this.mapSheetWithName(mapSheet) }));
    }

    public mapSheetWithName(mapSheet: string): string {
        const nz50Map: IMap = MapsService.MapsBySheet[mapSheet];
        return nz50Map ? nz50Map.sheetCode + ' ' + nz50Map.name : mapSheet;
    }

    private saveSelectedMaps(mapSheets: string[]): void {
        this.Save(mapSheets);
    }

    // -----------------

    private Save = (mapSheets: string[]): void => {
        const state: any = { editsMade: false, editing: false };
        if (mapSheets) {
            state.savingMapSheets = true;
        }
        this.setState(state, async () => {

            const promises = [];

            this.mapSheets = mapSheets;
            this.pendingMapSheets = mapSheets;
            this.props.onSave('maps', mapSheets
                    .filter(mapSheet => mapSheet)
                    .map(mapSheet => mapSheet + " " + MapsService.MapsBySheet[mapSheet].name)
                ).then(() => this.setState({ savingMapSheets: false }));
        });
    }
}