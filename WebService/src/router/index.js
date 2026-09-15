import { createRouter, createWebHistory } from 'vue-router'
import { authApi } from '../services/authApi'
import LoginView from '../views/LoginView.vue'; import SignupView from '../views/SignupView.vue'; import HomeView from '../views/HomeView.vue'; import ProfileEditView from '../views/ProfileEditView.vue'; import ProfilePreviewView from '../views/ProfilePreviewView.vue'; import PublicProfileView from '../views/PublicProfileView.vue'; import TeamListView from '../views/TeamListView.vue'; import TeamCreateView from '../views/TeamCreateView.vue'; import TeamJoinView from '../views/TeamJoinView.vue'; import TeamDetailView from '../views/TeamDetailView.vue'; import TeamMemberEditView from '../views/TeamMemberEditView.vue'; import MemberDetailView from '../views/MemberDetailView.vue'
const routes=[
 {path:'/login',component:LoginView,meta:{guest:true}},{path:'/signup',component:SignupView,meta:{guest:true}},{path:'/',component:HomeView},
 {path:'/profile/edit',component:ProfileEditView},{path:'/profile/preview',component:ProfilePreviewView},{path:'/p/:token',component:PublicProfileView,meta:{public:true}},
 {path:'/teams',component:TeamListView},{path:'/teams/create',component:TeamCreateView},{path:'/join/:code?',component:TeamJoinView},
 {path:'/teams/:id',component:TeamDetailView},{path:'/teams/:id/me/edit',component:TeamMemberEditView},{path:'/teams/:teamId/members/:memberId',component:MemberDetailView},
 {path:'/api-docs',component:()=>import('../views/ApiDocsView.vue'),meta:{public:true}},
]
const router=createRouter({history:createWebHistory(),routes,scrollBehavior:()=>({top:0})})
router.beforeEach((to)=>{if(!to.meta.public&&!to.meta.guest&&!authApi.getCurrentUser())return '/login'; if(to.meta.guest&&authApi.getCurrentUser())return '/'})
export default router
