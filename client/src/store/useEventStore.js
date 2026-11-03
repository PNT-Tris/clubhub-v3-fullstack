import{create}from'zustand';
export const useEventStore=create(set=>({search:'',category:'Tất cả',setSearch:search=>set({search}),setCategory:category=>set({category})}));