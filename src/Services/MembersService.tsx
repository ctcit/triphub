import { BaseUrl } from '..';
import { IMember, Role } from '../Interfaces';
import { apiCall } from '../Utilities';

export class MembersService {

    // offline GET supported
    public static async getMembers(force: boolean = false): Promise<IMember[]> {
        if (force || !this.getMembersPromise) {
            this.getMembersPromise = new Promise<IMember[]>((resolve, reject) => {
                apiCall('GET', BaseUrl + '/members')
                    .then((members: IMember[]) => {
                        this.members = members

                        this.membersById = new Map<number, IMember>()
                        this.membersByName = new Map<string, IMember>()
                        this.me = members.find((m: IMember) => m.isMe) || {} as unknown as IMember
        
                        members = members.filter(m => m.name !== '')
                        members.filter(m => m.isMember).forEach(m => this.membersById.set(m.id, m))
                        members.filter(m => m.isMember).forEach(m => this.membersByName.set(m.name, m))
                        members = members.filter(m => m.isMember || !this.membersByName[m.name])
                        members.filter(m => !m.isMember).forEach(m => this.membersByName.set(m.name, m))
                        members.forEach(m => m.role = Role[m.role as unknown as string])
                        
                        resolve(members);
                    }, () => resolve([]));
            });
        }
        return this.getMembersPromise;
    }

    public static async postMemberUpdate(id: number, data: any): Promise<IMember> {
        return apiCall('POST', BaseUrl + '/members/' + id, data)
            .then((members: IMember[]) => members[0])
    }

    public static async getMembersById(force: boolean = false): Promise<Map<number, IMember>> {
        return MembersService.getMembers(force)
            .then(() => MembersService.membersById, 
                  () => new Map<number, IMember>())
    }

    public static async getMembersByName(force: boolean = false): Promise<Map<string, IMember>> {
        return MembersService.getMembers(force)
            .then(() => MembersService.membersByName, 
                  () => new Map<string, IMember>())
    }

    public static async getMe(force: boolean = false): Promise<IMember> {
        return MembersService.getMembers(force)
            .then(() => MembersService.me)
    }

    public static get Members(): IMember[] {
        return MembersService.members
    }

    public static get MembersById(): Map<number, IMember> {
        return MembersService.membersById
    }

    public static get MembersByName(): Map<string, IMember> {
        return MembersService.membersByName
    }

    public static get Me(): IMember {
        return MembersService.me
    }

    public static getMemberById(id: number): IMember {
        return MembersService.membersById.get(id) || { id, name: 'Anonymous' } as IMember
    }

    public static getMemberByName(name: string): IMember | undefined {
        return MembersService.membersByName.get(name)
    }

    public static amAdmin(role: Role): boolean { return role >= Role.Admin }

    public static amTripLeader(role: Role): boolean { return role >= Role.TripLeader }

    private static getMembersPromise: Promise<IMember[]> | undefined = undefined

    private static members: IMember[] = []
    private static membersById: Map<number, IMember> = new Map<number, IMember>()
    private static membersByName: Map<string, IMember> = new Map<string, IMember>()
    private static me: IMember = {} as IMember

}
