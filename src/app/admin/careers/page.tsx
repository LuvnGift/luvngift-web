'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useAdminJobs,
  useCreateJob,
  useUpdateJob,
  useDeleteJob,
  useJobApplications,
  useUpdateApplicationStatus,
  type JobEmploymentType,
  type JobStatus,
  type ApplicationStatus,
} from '@/hooks/use-admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';

interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: JobEmploymentType;
  description: string;
  status: JobStatus;
  _count?: { applications: number };
}

interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  resumeUrl: string;
  status: ApplicationStatus;
  createdAt: string;
  job?: { title: string };
}

const EMPLOYMENT: { value: JobEmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'REMOTE', label: 'Remote' },
];

const APP_STATUSES: ApplicationStatus[] = ['NEW', 'REVIEWING', 'INTERVIEW', 'REJECTED', 'HIRED'];

const schema = z.object({
  title: z.string().min(2, 'Title is required').max(120),
  department: z.string().max(80).optional().or(z.literal('')),
  location: z.string().max(120).optional().or(z.literal('')),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'REMOTE']),
  description: z.string().min(20, 'Description must be at least 20 characters').max(20000),
  status: z.enum(['OPEN', 'CLOSED']),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  title: '',
  department: '',
  location: '',
  employmentType: 'FULL_TIME',
  description: '',
  status: 'OPEN',
};

function toPayload(v: FormValues) {
  return {
    title: v.title,
    department: v.department?.trim() || undefined,
    location: v.location?.trim() || undefined,
    employmentType: v.employmentType,
    description: v.description,
    status: v.status,
  };
}

export default function AdminCareersPage() {
  const [tab, setTab] = useState<'jobs' | 'applications'>('jobs');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Careers</h1>
        <p className="text-muted-foreground text-sm">Post roles and review applicants.</p>
      </div>

      <div className="flex gap-2 border-b">
        {(['jobs', 'applications'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'jobs' ? <JobsTab /> : <ApplicationsTab />}
    </div>
  );
}

function JobsTab() {
  const { data, isLoading } = useAdminJobs();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Job | null>(null);

  const createForm = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });
  const editForm = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  const handleCreate = (values: FormValues) => {
    createJob.mutate(toPayload(values), {
      onSuccess: () => {
        setCreateOpen(false);
        createForm.reset(EMPTY);
      },
    });
  };

  const handleEdit = (job: Job) => {
    setEditTarget(job);
    editForm.reset({
      title: job.title,
      department: job.department ?? '',
      location: job.location ?? '',
      employmentType: job.employmentType,
      description: job.description,
      status: job.status,
    });
  };

  const handleUpdate = (values: FormValues) => {
    if (!editTarget) return;
    updateJob.mutate({ id: editTarget.id, ...toPayload(values) }, { onSuccess: () => setEditTarget(null) });
  };

  const handleToggleStatus = (job: Job) => {
    updateJob.mutate({ id: job.id, title: job.title, description: job.description, status: job.status === 'OPEN' ? 'CLOSED' : 'OPEN' });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remove this job posting? This cannot be undone.')) return;
    deleteJob.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const jobs: Job[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Job
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Title</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Location</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Applicants</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      No job postings yet.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{job.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {EMPLOYMENT.find((e) => e.value === job.employmentType)?.label ?? job.employmentType}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{job.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={job.status === 'OPEN' ? 'default' : 'secondary'}>{job.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{job._count?.applications ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleToggleStatus(job)} disabled={updateJob.isPending}>
                            {job.status === 'OPEN' ? 'Close' : 'Reopen'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(job)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(job.id)}
                            disabled={deleteJob.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Job</DialogTitle>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 py-2">
            <JobFields form={createForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createJob.isPending}>
                {createJob.isPending ? 'Posting...' : 'Post Job'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4 py-2">
            <JobFields form={editForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={updateJob.isPending}>
                {updateJob.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobFields({ form }: { form: ReturnType<typeof useForm<FormValues>> }) {
  const { register, setValue, watch, formState: { errors } } = form;
  const employmentType = watch('employmentType');
  const status = watch('status');

  return (
    <>
      <div className="space-y-2">
        <Label>Title</Label>
        <Input {...register('title')} placeholder="e.g. Senior Backend Engineer" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Department (optional)</Label>
          <Input {...register('department')} placeholder="e.g. Engineering" />
        </div>
        <div className="space-y-2">
          <Label>Location (optional)</Label>
          <Input {...register('location')} placeholder="e.g. Lagos / Remote" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Employment type</Label>
          <Select value={employmentType} onValueChange={(v) => setValue('employmentType', v as JobEmploymentType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMPLOYMENT.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setValue('status', v as JobStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea {...register('description')} rows={8} placeholder="Role overview, responsibilities, requirements..." />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>
    </>
  );
}

function ApplicationsTab() {
  const { data, isLoading } = useJobApplications();
  const updateStatus = useUpdateApplicationStatus();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const applications: Application[] = data?.data ?? [];

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Applicant</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Applied</th>
                <th className="px-4 py-3 text-left font-medium">Résumé</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No applications yet.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{app.firstName} {app.lastName}</div>
                      <a href={`mailto:${app.email}`} className="text-xs text-muted-foreground hover:text-foreground">{app.email}</a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{app.job?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={app.status}
                        onValueChange={(v) => updateStatus.mutate({ id: app.id, status: v as ApplicationStatus })}
                      >
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {APP_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
