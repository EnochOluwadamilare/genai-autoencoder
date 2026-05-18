import { LangSelect, Privacy, theme } from '@genai-fi/base';
import gitInfo from '../../generatedGitInfo.json';
import { styled, ThemeProvider } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import style from './style.module.css';
import LinkButton from './LinkButton';
import GitHubIcon from '@mui/icons-material/GitHub';
import SchoolIcon from '@mui/icons-material/School';
import Grid from '@mui/material/Grid';
import { Button, Paper, TextField } from '@mui/material';
import { LANGS } from '../../components/AppBar/AppBar';
import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#fff',
  ...theme.typography.body2,
  padding: theme.spacing(1),
  textAlign: 'center',
  color: (theme.vars ?? theme).palette.text.secondary,
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));

function Home() {
    const { t } = useTranslation('image_adv');
    const [pinError, setPinError] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const doKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                const value = (e.target as HTMLInputElement).value;

                if (value.length < 3) {
                    setPinError(true);
                    return;
                }

                if (/^[0-9]+$/.test(value) === false) {
                    setPinError(true);
                    return;
                }

            }
        },
        [navigate('/level-1')]
    );

    const doGo = useCallback(() => {
        if (inputRef.current) {
            const value = inputRef.current.value;

            if (value.length < 2) {
                setPinError(true);
                return;
            }
        }
    }, [navigate('/level-1')]);

  return <>
    <ThemeProvider theme={theme}>
        <main className={style.homeContainer}>
            <div className={style.lang}>
                <LangSelect
                    languages={LANGS}
                    ns="image_adv"
                />
            </div>

            <div className={style.heroSection}>
                <div className={style.logoSection}>
                    <img
                        src="/logo192.png"
                        alt="GenAI logo"
                        className={style.logo}
                    />
                </div>

                <div className={style.contentSection}>
                    <h1>{t('app.title')}</h1>

                    <h2>{t('app.subtitle')}</h2>

                    <div className={style.buttons}>
                        <LinkButton
                            href="https://gen-ai.fi/en/materials/classifier-unit"
                            startIcon={<SchoolIcon />}
                        >
                            {t('app.teachingMaterials')}
                        </LinkButton>

                        <LinkButton
                            href="https://github.com/knicos/genai-tm"
                            startIcon={<GitHubIcon />}
                        >
                            {t('app.github')}
                        </LinkButton>
                    </div>

                    <div className={style.intro}>
                        {t('app.startGame')}
                    </div>

                    <div className={style.sessionArea}>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/level-1')}
                            className={style.createButton}
                        >
                            {t('home.actions.createNew')}
                        </Button>

                        <div className={style.or}>
                            {t('home.labels.or')}
                        </div>

                        <div className={style.joinSection}>
                            <TextField
                                label={t('home.labels.enterCode')}
                                onKeyDown={doKeyDown}
                                fullWidth
                                className={style.textbox}
                                inputRef={inputRef}
                                error={pinError}
                            />

                            <Button
                                variant="contained"
                                fullWidth
                                size="large"
                                onClick={doGo}
                            >
                                {t('home.actions.go')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Privacy
                position="bottomLeft"
                appName="AutoEncoder"
                tag={gitInfo.gitTag || 'notag'}
            />
        </main>
    </ThemeProvider>
  </>;
  
}

export default Home;